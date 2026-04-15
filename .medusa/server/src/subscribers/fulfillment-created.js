"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = fulfillmentCreatedHandler;
const resend_1 = require("resend");
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
async function fulfillmentCreatedHandler({ event, container, }) {
    console.log("📦 [Subscriber] fulfillment.created fired – data:", JSON.stringify(event.data));
    try {
        const query = container.resolve("query");
        // Fulfillment-Daten holen
        const { data: [fulfillment] } = await query.graph({
            entity: "fulfillment",
            filters: { id: event.data.id },
            fields: [
                "id", "items.*", "labels.*",
                "order.id", "order.display_id", "order.email", "order.currency_code",
                "order.items.*", "order.shipping_address.*",
            ],
        });
        if (!fulfillment?.order) {
            console.warn("⚠️ [Subscriber] Fulfillment or order not found:", event.data.id);
            return;
        }
        const order = fulfillment.order;
        const cc = (order.currency_code || "EUR").toUpperCase();
        const fmt = (cents) => (cents / 100).toFixed(2).replace(".", ",");
        const addr = order.shipping_address;
        // Tracking-Info aus Labels
        const label = fulfillment.labels?.[0];
        const trackingNumber = label?.tracking_number || null;
        const trackingUrl = label?.tracking_url || null;
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
        ${addr?.first_name || ""} ${addr?.last_name || ""}<br>
        ${addr?.address_1 || ""}<br>
        ${addr?.postal_code || ""} ${addr?.city || ""}<br>
        ${addr?.country_code?.toUpperCase() || ""}
      </p>
      <p style="text-align:center;color:#666;font-size:13px;margin-top:24px;">The Girardi Oil / 1000 Horia</p>
    </div>`;
        await resend.emails.send({
            from: process.env.RESEND_FROM || "onboarding@resend.dev",
            to: order.email,
            subject: `Deine Bestellung #${order.display_id} wurde versendet – The Girardi Oil`,
            html,
        });
        console.log(`✅ [Subscriber] Fulfillment email sent to: ${order.email}`);
    }
    catch (err) {
        console.error("❌ [Subscriber] fulfillment.created error:", err.message);
    }
}
exports.config = {
    event: "fulfillment.created",
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVsZmlsbG1lbnQtY3JlYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9zdWJzY3JpYmVycy9mdWxmaWxsbWVudC1jcmVhdGVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUtBLDRDQXlGQztBQTdGRCxtQ0FBK0I7QUFFL0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxlQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtBQUV0QyxLQUFLLFVBQVUseUJBQXlCLENBQUMsRUFDdEQsS0FBSyxFQUNMLFNBQVMsR0FDeUM7SUFDbEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtREFBbUQsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBRTVGLElBQUksQ0FBQztRQUNILE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFeEMsMEJBQTBCO1FBQzFCLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxHQUFHLE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQztZQUNoRCxNQUFNLEVBQUUsYUFBYTtZQUNyQixPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUU7WUFDOUIsTUFBTSxFQUFFO2dCQUNOLElBQUksRUFBRSxTQUFTLEVBQUUsVUFBVTtnQkFDM0IsVUFBVSxFQUFFLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxxQkFBcUI7Z0JBQ3BFLGVBQWUsRUFBRSwwQkFBMEI7YUFDNUM7U0FDRixDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsV0FBVyxFQUFFLEtBQUssRUFBRSxDQUFDO1lBQ3hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsaURBQWlELEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUM5RSxPQUFNO1FBQ1Is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