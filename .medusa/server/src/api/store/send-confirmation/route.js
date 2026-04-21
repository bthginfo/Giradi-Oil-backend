"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const mailer_1 = require("../../../lib/mailer");

async function POST(req, res) {
  try {
    const { order_id, payment_method, is_pickup, billing_address } = req.body;
    if (!order_id) {
      return res.status(400).json({ message: "order_id is required" });
    }
    const query = req.scope.resolve("query");
    const { data: [order] } = await query.graph({
      entity: "order",
      filters: { id: order_id },
      fields: [
        "id", "display_id", "email", "total", "subtotal",
        "shipping_total", "tax_total", "currency_code",
        "items.*", "shipping_address.*",
      ],
    });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const currencyCode = (order.currency_code || "EUR").toUpperCase();
    const fmt = (cents) => Number(cents).toFixed(2).replace(".", ",");
    const itemRows = (order.items || []).map((item) => {
      const unitPrice = fmt(Number(item.unit_price || 0));
      const lineTotal = fmt(Number(item.unit_price || 0) * Number(item.quantity || 1));
      return `<tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #3a3a2a;">
          ${item.title}<br><span style="color: #999; font-size: 13px;">x${item.quantity} \u00e0 ${unitPrice} ${currencyCode}</span>
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #3a3a2a; text-align: right;">
          ${lineTotal} ${currencyCode}
        </td>
      </tr>`;
    }).join("");
    const subtotal = fmt(Number(order.subtotal || 0));
    const shipping = fmt(Number(order.shipping_total || 0));
    const tax = fmt(Number(order.tax_total || 0));
    const total = fmt(Number(order.total || 0));
    const addr = order.shipping_address;

    const isPickup = is_pickup === true || (payment_method || "").toLowerCase() === "bar";
    const isFreeShipping = !isPickup && Number(order.shipping_total || 0) === 0;
    const shippingLabel = isPickup ? "Abholung (gratis)" : isFreeShipping ? "Kostenloser Versand" : `${shipping} ${currencyCode}`;

    var paymentBlock = "";
    var pm = (payment_method || "").toLowerCase();
    if (pm === "paypal") {
      paymentBlock = `<div style="background: #275425; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <p style="color: #C5A572; margin: 0 0 4px; font-weight: bold;">\u2705 Zahlung erhalten</p>
        <p style="color: #FAF8F3; margin: 0; font-size: 14px;">
          Deine Zahlung \u00fcber PayPal wurde erfolgreich verarbeitet. Wir bereiten deine Bestellung jetzt f\u00fcr den Versand vor.
        </p>
      </div>`;
    } else if (pm === "vorkasse") {
      paymentBlock = `<div style="background: #275425; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <p style="color: #C5A572; margin: 0 0 4px; font-weight: bold;">Zahlungsinformationen \u2013 Vorkasse</p>
        <p style="color: #FAF8F3; margin: 0; font-size: 14px; line-height: 1.7;">
          Bitte \u00fcberweise den Gesamtbetrag von <strong>${total} ${currencyCode}</strong> an:<br><br>
          <strong>Empf\u00e4nger:</strong> Girardi M.u.Mitges.<br>
          <strong>IBAN:</strong> AT57 3600 0000 0421 8830<br>
          <strong>BIC:</strong> RZTIAT22<br>
          <strong>Verwendungszweck:</strong> Bestellung #${order.display_id}<br><br>
          Deine Bestellung wird nach Zahlungseingang versendet.
        </p>
      </div>`;
    } else if (pm === "bar") {
      paymentBlock = `<div style="background: #275425; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <p style="color: #C5A572; margin: 0 0 4px; font-weight: bold;">Barzahlung bei Abholung</p>
        <p style="color: #FAF8F3; margin: 0; font-size: 14px; line-height: 1.7;">
          Bitte bringe den Betrag von <strong>${total} ${currencyCode}</strong> in bar zur Abholung mit.<br><br>
          Wir melden uns bei dir, sobald deine Bestellung abholbereit ist.
        </p>
      </div>`;
    } else {
      paymentBlock = `<div style="background: #275425; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <p style="color: #C5A572; margin: 0 0 4px; font-weight: bold;">N\u00e4chster Schritt</p>
        <p style="color: #FAF8F3; margin: 0; font-size: 14px;">
          Wir melden uns bei dir mit den weiteren Details per E-Mail.
        </p>
      </div>`;
    }

    const ba = billing_address || {};
    const addressBlock = isPickup ? `
      <h3 style="color: #7a9a58; font-size: 16px; margin: 24px 0 8px;">Rechnungsadresse</h3>
      <p style="margin: 0; line-height: 1.6;">
        ${ba.first_name || addr?.first_name || ""} ${ba.last_name || addr?.last_name || ""}<br>
        ${ba.address_1 || ""}<br>
        ${ba.postal_code || ""} ${ba.city || ""}<br>
        ${(ba.country_code || "").toUpperCase()}
      </p>
      <h3 style="color: #7a9a58; font-size: 16px; margin: 24px 0 8px;">Abholung in der Werkstatt</h3>
      <p style="margin: 0; line-height: 1.6;">
        Girardi Oil Werkstatt<br>
        1000 Horia<br>
        AT
      </p>
    ` : `
      <h3 style="color: #7a9a58; font-size: 16px; margin: 24px 0 8px;">Rechnungs- und Lieferadresse</h3>
      <p style="margin: 0; line-height: 1.6;">
        ${addr?.first_name || ""} ${addr?.last_name || ""}<br>
        ${addr?.address_1 || ""}<br>
        ${addr?.postal_code || ""} ${addr?.city || ""}<br>
        ${addr?.country_code?.toUpperCase() || ""}
      </p>
    `;

    const html = `
    <div style="max-width: 480px; margin: 0 auto; background: #1a1a14; color: #FAF8F3; font-family: Georgia, serif; padding: 32px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #C5A572; margin: 0; font-size: 28px;">The Girardi Oil</h1>
        <p style="color: #7a9a58; margin: 4px 0 0;">1000 Horia</p>
      </div>
      <h2 style="color: #7a9a58; font-size: 22px;">Vielen Dank f\u00fcr deine Bestellung!</h2>
      <p style="margin: 0 0 16px;">Bestellnummer: <strong>#${order.display_id}</strong></p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">${itemRows}</table>
      <table style="width: 100%; font-size: 14px; margin-bottom: 8px;">
        <tr><td style="padding: 4px 0; color: #ccc;">Zwischensumme</td><td style="padding: 4px 0; text-align: right;">${subtotal} ${currencyCode}</td></tr>
        <tr><td style="padding: 4px 0; color: #ccc;">Versand</td><td style="padding: 4px 0; text-align: right;">${shippingLabel}</td></tr>
        <tr><td style="padding: 4px 0; color: #ccc;">MwSt.</td><td style="padding: 4px 0; text-align: right;">${tax} ${currencyCode}</td></tr>
      </table>
      <p style="font-size: 18px; margin: 16px 0; border-top: 2px solid #C5A572; padding-top: 12px;">
        Gesamtbetrag: <strong style="color: #C5A572;">${total} ${currencyCode}</strong>
      </p>
      ${addressBlock}
      ${paymentBlock}
      <p style="text-align: center; color: #666; font-size: 13px; margin-top: 24px;">
        The Girardi Oil / 1000 Horia
      </p>
    </div>`;
    await (0, mailer_1.sendMail)({
      to: order.email,
      subject: `Bestellbest\u00e4tigung #${order.display_id} \u2013 The Girardi Oil`,
      html,
    });
    console.log(`\u2705 Order confirmation email sent to: ${order.email} \u2013 Total: ${total} ${currencyCode}`);
    return res.json({ success: true, email_sent: true });
  } catch (error) {
    console.error("\u274c send-confirmation error:", error);
    return res.status(500).json({ message: error.message });
  }
}
