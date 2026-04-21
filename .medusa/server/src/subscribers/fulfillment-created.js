"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = fulfillmentCreatedHandler;
const mailer_1 = require("../lib/mailer");
async function fulfillmentCreatedHandler({ event, container }) {
    console.log("📦 [Subscriber] fulfillment.created fired – data:", JSON.stringify(event.data));
    try {
        const query = container.resolve("query");
        let orderId = event.data.order_id;
        let fulfillmentData = null;
        if (!orderId) {
            try {
                const { data: [f] } = await query.graph({
                    entity: "fulfillment",
                    filters: { id: event.data.id },
                    fields: ["id", "labels.*"],
                });
                fulfillmentData = f;
            } catch (e) {
                console.warn("[Subscriber] Could not query fulfillment:", e.message);
            }
            try {
                const { data: links } = await query.graph({
                    entity: "order_fulfillment",
                    filters: { fulfillment_id: event.data.id },
                    fields: ["order_id"],
                });
                if (links && links[0] && links[0].order_id) orderId = links[0].order_id;
            } catch (e) {
                console.warn("[Subscriber] order_fulfillment link query failed:", e.message);
            }
        }
        if (!orderId) {
            console.warn("⚠️ [Subscriber] Could not find order for fulfillment:", event.data.id);
            return;
        }
        const { data: [order] } = await query.graph({
            entity: "order",
            filters: { id: orderId },
            fields: ["id", "display_id", "email", "currency_code", "items.*", "shipping_address.*"],
        });
        if (!order) {
            console.warn("⚠️ [Subscriber] Order not found:", orderId);
            return;
        }
        const cc = (order.currency_code || "EUR").toUpperCase();
        const fmt = (cents) => Number(cents).toFixed(2).replace(".", ",");
        const addr = order.shipping_address;
        const label = fulfillmentData && fulfillmentData.labels && fulfillmentData.labels[0] ? fulfillmentData.labels[0] : null;
        const trackingNumber = (label && label.tracking_number) || event.data.tracking_number || null;
        const trackingUrl = (label && label.tracking_url) || event.data.tracking_url || null;
        const trackingHtml = trackingNumber
            ? `<div style="background:#275425;padding:16px;border-radius:8px;margin:24px 0;">
           <p style="color:#C5A572;margin:0 0 4px;font-weight:bold;">Sendungsverfolgung</p>
           <p style="color:#FAF8F3;margin:0;font-size:14px;">
             Tracking-Nummer: <strong>${trackingNumber}</strong>
             ${trackingUrl ? `<br><a href="${trackingUrl}" style="color:#C5A572;">Sendung verfolgen →</a>` : ""}
           </p>
         </div>`
            : `<div style="background:#275425;padding:16px;border-radius:8px;margin:24px 0;">
           <p style="color:#C5A572;margin:0 0 4px;font-weight:bold;">Versandinfo</p>
           <p style="color:#FAF8F3;margin:0;font-size:14px;">Deine Bestellung ist auf dem Weg! Die Lieferung erfolgt in der Regel innerhalb von 3-5 Werktagen.</p>
         </div>`;
        const itemRows = (order.items || [])
            .map((item) => `<tr>
        <td style="padding:6px 0;border-bottom:1px solid #3a3a2a;">
          ${item.title} <span style="color:#999;font-size:13px;">x${item.quantity}</span>
        </td>
        <td style="padding:6px 0;border-bottom:1px solid #3a3a2a;text-align:right;">
          ${fmt(Number(item.unit_price || 0) * Number(item.quantity || 1))} ${cc}
        </td>
      </tr>`).join("");
        const html = `
    <div style="max-width:480px;margin:0 auto;background:#1a1a14;color:#FAF8F3;font-family:Georgia,serif;padding:32px;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#C5A572;margin:0;font-size:28px;">The Girardi Oil</h1>
        <p style="color:#7a9a58;margin:4px 0 0;">1000 Horia</p>
      </div>
      <h2 style="color:#7a9a58;font-size:22px;">Deine Bestellung wurde versendet! 📦</h2>
      <p>Bestellnummer: <strong>#${order.display_id}</strong></p>
      ${trackingHtml}
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">${itemRows}</table>
      <h3 style="color:#7a9a58;font-size:16px;margin:24px 0 8px;">Lieferadresse</h3>
      <p style="margin:0;line-height:1.6;">
        ${(addr && addr.first_name) || ""} ${(addr && addr.last_name) || ""}<br>
        ${(addr && addr.address_1) || ""}<br>
        ${(addr && addr.postal_code) || ""} ${(addr && addr.city) || ""}<br>
        ${addr && addr.country_code ? addr.country_code.toUpperCase() : ""}
      </p>
      <p style="text-align:center;color:#666;font-size:13px;margin-top:24px;">The Girardi Oil / 1000 Horia</p>
    </div>`;
        await (0, mailer_1.sendMail)({
            to: order.email,
            subject: `Deine Bestellung #${order.display_id} wurde versendet \u2013 The Girardi Oil`,
            html,
        });
        console.log(`\u2705 [Subscriber] Fulfillment email sent to: ${order.email}`);
    }
    catch (err) {
        console.error("\u274c [Subscriber] fulfillment.created error:", err.message);
    }
}
exports.config = {
    event: "fulfillment.created",
};
