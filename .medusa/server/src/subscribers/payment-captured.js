"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = paymentCapturedHandler;
const mailer_1 = require("../lib/mailer");

async function paymentCapturedHandler({ event, container }) {
  console.log("[Subscriber] payment.captured fired - data:", JSON.stringify(event.data));
  try {
    var query = container.resolve("query");
    var result = await query.graph({
      entity: "payment",
      filters: { id: event.data.id },
      fields: ["id","amount","currency_code","provider_id","payment_collection.order.id","payment_collection.order.display_id","payment_collection.order.email","payment_collection.order.total","payment_collection.order.currency_code","payment_collection.order.items.*","payment_collection.order.shipping_address.*"],
    });
    var payment = result.data[0];
    var order = payment && payment.payment_collection ? payment.payment_collection.order : null;
    if (!order) { console.warn("[Subscriber] Order not found for payment:", event.data.id); return; }
    var providerId = (payment && payment.provider_id) || "";
    if (providerId.includes("paypal")) {
      console.log("[Subscriber] Skipping payment.captured email for PayPal (frontend handles it)");
      return;
    }
    var cc = (order.currency_code || "EUR").toUpperCase();
    var fmt = function(c) { return Number(c).toFixed(2).replace(".", ","); };
    var itemRows = (order.items || []).map(function(item) {
      return '<tr><td style="padding:6px 0;border-bottom:1px solid #3a3a2a;">' + item.title + ' <span style="color:#999;font-size:13px;">x' + item.quantity + '</span></td><td style="padding:6px 0;border-bottom:1px solid #3a3a2a;text-align:right;">' + fmt(Number(item.unit_price||0)*Number(item.quantity||1)) + ' ' + cc + '</td></tr>';
    }).join("");
    var addr = order.shipping_address;
    var html = '<div style="max-width:480px;margin:0 auto;background:#1a1a14;color:#FAF8F3;font-family:Georgia,serif;padding:32px;border-radius:12px;"><div style="text-align:center;margin-bottom:24px;"><h1 style="color:#C5A572;margin:0;font-size:28px;">The Girardi Oil</h1><p style="color:#7a9a58;margin:4px 0 0;">1000 Horia</p></div><h2 style="color:#7a9a58;font-size:22px;">Zahlung erhalten! \u2705</h2><p>Wir haben die Zahlung f\u00fcr deine Bestellung <strong>#' + order.display_id + '</strong> erhalten.</p><table style="width:100%;border-collapse:collapse;margin-bottom:16px;">' + itemRows + '</table><p style="font-size:16px;border-top:2px solid #C5A572;padding-top:12px;">Bezahlter Betrag: <strong style="color:#C5A572;">' + fmt(Number(order.total||0)) + ' ' + cc + '</strong></p><h3 style="color:#7a9a58;font-size:16px;margin:24px 0 8px;">Lieferadresse</h3><p style="margin:0;line-height:1.6;">' + (addr&&addr.first_name||"") + " " + (addr&&addr.last_name||"") + "<br>" + (addr&&addr.address_1||"") + "<br>" + (addr&&addr.postal_code||"") + " " + (addr&&addr.city||"") + "<br>" + (addr&&addr.country_code?addr.country_code.toUpperCase():"") + '</p><div style="background:#275425;padding:16px;border-radius:8px;margin:24px 0;"><p style="color:#C5A572;margin:0 0 4px;font-weight:bold;">N\u00e4chster Schritt</p><p style="color:#FAF8F3;margin:0;font-size:14px;">Deine Bestellung wird nun f\u00fcr den Versand vorbereitet. Du erh\u00e4ltst eine weitere E-Mail, sobald sie losgeschickt wird.</p></div><p style="text-align:center;color:#666;font-size:13px;margin-top:24px;">The Girardi Oil / 1000 Horia</p></div>';
    await (0, mailer_1.sendMail)({ to: order.email, subject: "Zahlung erhalten f\u00fcr Bestellung #" + order.display_id + " \u2013 The Girardi Oil", html: html });
    console.log("[Subscriber] Payment captured email sent to:", order.email);
  } catch (err) {
    console.error("[Subscriber] payment.captured error:", err.message);
  }
}
exports.config = { event: "payment.captured" };
