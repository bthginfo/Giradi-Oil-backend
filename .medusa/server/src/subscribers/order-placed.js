"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = orderPlacedHandler;
const resend_1 = require("resend");
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
async function orderPlacedHandler({ event, container, }) {
    console.log("📧 [Subscriber] order.placed fired – order:", event.data.id);
    try {
        const query = container.resolve("query");
        const { data: [order] } = await query.graph({
            entity: "order",
            filters: { id: event.data.id },
            fields: [
                "id", "display_id", "email", "total", "subtotal",
                "shipping_total", "tax_total", "currency_code",
                "items.*", "shipping_address.*",
            ],
        });
        if (!order) {
            console.warn("⚠️ [Subscriber] Order not found:", event.data.id);
            return;
        }
        // Prüfen ob Frontend bereits E-Mail geschickt hat (via metadata flag)
        // Falls Frontend die Mail schon geschickt hat, nicht nochmal senden
        // Sicherheitshalber senden wir trotzdem – doppelt hält besser bei Vorkasse
        const cc = (order.currency_code || "EUR").toUpperCase();
        const fmt = (cents) => (cents / 100).toFixed(2).replace(".", ",");
        const itemRows = (order.items || [])
            .map((item) => {
            const lineTotal = fmt(Number(item.unit_price || 0) * Number(item.quantity || 1));
            return `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #3a3a2a;">
            ${item.title}<br><span style="color:#999;font-size:13px;">x${item.quantity} à ${fmt(Number(item.unit_price || 0))} ${cc}</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #3a3a2a;text-align:right;">${lineTotal} ${cc}</td>
        </tr>`;
        }).join("");
        const addr = order.shipping_address;
        const isPickup = Number(order.shipping_total || 0) === 0;
        const html = `
    <div style="max-width:480px;margin:0 auto;background:#1a1a14;color:#FAF8F3;font-family:Georgia,serif;padding:32px;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#C5A572;margin:0;font-size:28px;">The Girardi Oil</h1>
        <p style="color:#7a9a58;margin:4px 0 0;">1000 Horia</p>
      </div>
      <h2 style="color:#7a9a58;font-size:22px;">Vielen Dank für deine Bestellung!</h2>
      <p>Bestellnummer: <strong>#${order.display_id}</strong></p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">${itemRows}</table>
      <table style="width:100%;font-size:14px;margin-bottom:8px;">
        <tr><td style="padding:4px 0;color:#ccc;">Zwischensumme</td><td style="text-align:right;">${fmt(Number(order.subtotal || 0))} ${cc}</td></tr>
        <tr><td style="padding:4px 0;color:#ccc;">Versand</td><td style="text-align:right;">${isPickup ? "Abholung (gratis)" : fmt(Number(order.shipping_total || 0)) + " " + cc}</td></tr>
        <tr><td style="padding:4px 0;color:#ccc;">MwSt.</td><td style="text-align:right;">${fmt(Number(order.tax_total || 0))} ${cc}</td></tr>
      </table>
      <p style="font-size:18px;border-top:2px solid #C5A572;padding-top:12px;">
        Gesamtbetrag: <strong style="color:#C5A572;">${fmt(Number(order.total || 0))} ${cc}</strong>
      </p>
      <h3 style="color:#7a9a58;font-size:16px;margin:24px 0 8px;">Lieferadresse</h3>
      <p style="margin:0;line-height:1.6;">
        ${addr?.first_name || ""} ${addr?.last_name || ""}<br>
        ${addr?.address_1 || ""}<br>
        ${addr?.postal_code || ""} ${addr?.city || ""}<br>
        ${addr?.country_code?.toUpperCase() || ""}
      </p>
      <div style="background:#275425;padding:16px;border-radius:8px;margin:24px 0;">
        <p style="color:#C5A572;margin:0 0 4px;font-weight:bold;">Nächster Schritt</p>
        <p style="color:#FAF8F3;margin:0;font-size:14px;">Wir melden uns bei dir mit den Zahlungsinformationen per E-Mail.</p>
      </div>
      <p style="text-align:center;color:#666;font-size:13px;margin-top:24px;">The Girardi Oil / 1000 Horia</p>
    </div>`;
        await resend.emails.send({
            from: process.env.RESEND_FROM || "onboarding@resend.dev",
            to: order.email,
            subject: `Bestellbestätigung #${order.display_id} – The Girardi Oil`,
            html,
        });
        console.log(`✅ [Subscriber] Order confirmation sent to: ${order.email}`);
    }
    catch (err) {
        console.error("❌ [Subscriber] order.placed error:", err.message);
    }
}
exports.config = {
    event: "order.placed",
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3JkZXItcGxhY2VkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3N1YnNjcmliZXJzL29yZGVyLXBsYWNlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFLQSxxQ0FzRkM7QUExRkQsbUNBQStCO0FBRS9CLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7QUFFdEMsS0FBSyxVQUFVLGtCQUFrQixDQUFDLEVBQy9DLEtBQUssRUFDTCxTQUFTLEdBQ3NCO0lBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkNBQTZDLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUV6RSxJQUFJLENBQUM7UUFDSCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRXhDLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQztZQUMxQyxNQUFNLEVBQUUsT0FBTztZQUNmLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRTtZQUM5QixNQUFNLEVBQUU7Z0JBQ04sSUFBSSxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFVBQVU7Z0JBQ2hELGdCQUFnQixFQUFFLFdBQVcsRUFBRSxlQUFlO2dCQUM5QyxTQUFTLEVBQUUsb0JBQW9CO2FBQ2hDO1NBQ0YsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1gsT0FBTyxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQy9ELE9BQU07UUFDUixDQUFDO1FBRUQsc0VBQXNFO1FBQ3RFLG9FQUFvRTtRQUNwRSwyRUFBMkU7UUFD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