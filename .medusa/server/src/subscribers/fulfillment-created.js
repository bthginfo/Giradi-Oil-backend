"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = fulfillmentCreatedHandler;
const mailer_1 = require("../lib/mailer");
const utils_1 = require("@medusajs/framework/utils");

async function fulfillmentCreatedHandler({ event, container }) {
  console.log("\ud83d\udce6 [Subscriber] fulfillment.created fired \u2013 ALL data:", JSON.stringify(event.data));
  console.log("\ud83d\udce6 [Subscriber] fulfillment.created \u2013 ALL event keys:", Object.keys(event));
  try {
    const query = container.resolve("query");
    const fulfillmentId = event.data.id;
    let orderId = event.data.order_id || null;
    if (orderId) { console.log("[Fulfillment] Got order_id from event:", orderId); }
    if (!orderId) {
      try {
        const { data: [f] } = await query.graph({ entity: "fulfillment", filters: { id: fulfillmentId }, fields: ["id", "order.id", "order.display_id"] });
        if (f && f.order && f.order.id) { orderId = f.order.id; console.log("[Fulfillment] Got order_id from fulfillment.order:", orderId); }
      } catch (e) { console.log("[Fulfillment] Strategy 2 failed:", e.message); }
    }
    if (!orderId) {
      try {
        const remoteQuery = container.resolve(utils_1.ContainerRegistrationKeys.REMOTE_QUERY);
        const links = await remoteQuery((0, utils_1.remoteQueryObjectFromString)({ entryPoint: "order_fulfillment", variables: { filters: { fulfillment_id: fulfillmentId } }, fields: ["order_id", "order.*"] }));
        if (links && links[0] && links[0].order_id) { orderId = links[0].order_id; console.log("[Fulfillment] Got order_id from remote query link:", orderId); }
      } catch (e) { console.log("[Fulfillment] Strategy 3 failed:", e.message); }
    }
    if (!orderId) {
      try {
        const { data: orders } = await query.graph({ entity: "order", fields: ["id", "display_id", "fulfillments.id"] });
        for (const o of (orders || [])) {
          const fIds = (o.fulfillments || []).map(function(f) { return f.id; });
          if (fIds.includes(fulfillmentId)) { orderId = o.id; console.log("[Fulfillment] Got order_id from order scan:", orderId); break; }
        }
      } catch (e) { console.log("[Fulfillment] Strategy 4 failed:", e.message); }
    }
    if (!orderId) { console.error("\u274c [Fulfillment] Could not find order for fulfillment:", fulfillmentId); return; }
    let trackingNumber = null, trackingUrl = null;
    try {
      const { data: [f] } = await query.graph({ entity: "fulfillment", filters: { id: fulfillmentId }, fields: ["id", "labels.*", "tracking_links.*"] });
      var label = f && f.labels && f.labels[0]; trackingNumber = (label && label.tracking_number) || null; trackingUrl = (label && label.tracking_url) || null;
      if (!trackingNumber) { var tl = f && f.tracking_links && f.tracking_links[0]; trackingNumber = (tl && tl.tracking_number) || null; trackingUrl = (tl && tl.url) || null; }
    } catch (e) { console.log("[Fulfillment] Could not get tracking info:", e.message); }
    const { data: [order] } = await query.graph({ entity: "order", filters: { id: orderId }, fields: ["id", "display_id", "email", "currency_code", "items.*", "shipping_address.*"] });
    if (!order) { console.error("\u274c [Fulfillment] Order not found:", orderId); return; }
    var cc = (order.currency_code || "EUR").toUpperCase();
    var fmt = function(c) { return Number(c).toFixed(2).replace(".", ","); };
    var addr = order.shipping_address;
    var trackingHtml = trackingNumber
      ? '<div style="background:#275425;padding:16px;border-radius:8px;margin:24px 0;"><p style="color:#C5A572;margin:0 0 4px;font-weight:bold;">Sendungsverfolgung</p><p style="color:#FAF8F3;margin:0;font-size:14px;">Tracking-Nummer: <strong>' + trackingNumber + '</strong>' + (trackingUrl ? '<br><a href="' + trackingUrl + '" style="color:#C5A572;">Sendung verfolgen \u2192</a>' : '') + '</p></div>'
      : '<div style="background:#275425;padding:16px;border-radius:8px;margin:24px 0;"><p style="color:#C5A572;margin:0 0 4px;font-weight:bold;">Versandinfo</p><p style="color:#FAF8F3;margin:0;font-size:14px;">Deine Bestellung ist auf dem Weg! Die Lieferung erfolgt in der Regel innerhalb von 3-5 Werktagen.</p></div>';
    var itemRows = (order.items || []).map(function(item) {
      return '<tr><td style="padding:6px 0;border-bottom:1px solid #3a3a2a;">' + item.title + ' <span style="color:#999;font-size:13px;">x' + item.quantity + '</span></td><td style="padding:6px 0;border-bottom:1px solid #3a3a2a;text-align:right;">' + fmt(Number(item.unit_price||0)*Number(item.quantity||1)) + ' ' + cc + '</td></tr>';
    }).join("");
    var html = '<div style="max-width:480px;margin:0 auto;background:#1a1a14;color:#FAF8F3;font-family:Georgia,serif;padding:32px;border-radius:12px;"><div style="text-align:center;margin-bottom:24px;"><h1 style="color:#C5A572;margin:0;font-size:28px;">The Girardi Oil</h1><p style="color:#7a9a58;margin:4px 0 0;">1000 Horia</p></div><h2 style="color:#7a9a58;font-size:22px;">Deine Bestellung wurde versendet! \ud83d\udce6</h2><p>Bestellnummer: <strong>#' + order.display_id + '</strong></p>' + trackingHtml + '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">' + itemRows + '</table><h3 style="color:#7a9a58;font-size:16px;margin:24px 0 8px;">Lieferadresse</h3><p style="margin:0;line-height:1.6;">' + ((addr&&addr.first_name)||"") + " " + ((addr&&addr.last_name)||"") + "<br>" + ((addr&&addr.address_1)||"") + "<br>" + ((addr&&addr.postal_code)||"") + " " + ((addr&&addr.city)||"") + "<br>" + (addr&&addr.country_code?addr.country_code.toUpperCase():"") + '</p><p style="text-align:center;color:#666;font-size:13px;margin-top:24px;">The Girardi Oil / 1000 Horia</p></div>';
    await (0, mailer_1.sendMail)({ to: order.email, subject: "Deine Bestellung #" + order.display_id + " wurde versendet \u2013 The Girardi Oil", html: html });
    console.log("\u2705 [Fulfillment] Email sent to:", order.email);
  } catch (err) {
    console.error("\u274c [Fulfillment] Error:", err.message, err.stack ? err.stack.slice(0, 300) : "");
  }
}
exports.config = { event: "fulfillment.created" };
