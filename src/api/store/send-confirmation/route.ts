import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendMail } from "../../lib/mailer"


export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { order_id, payment_method, is_pickup, billing_address } = req.body as { order_id: string; payment_method?: string; is_pickup?: boolean; billing_address?: { first_name: string; last_name: string; address_1: string; postal_code: string; city: string; country_code: string } }

    if (!order_id) {
      return res.status(400).json({ message: "order_id is required" })
    }

    const query = req.scope.resolve("query")

    const { data: [order] } = await query.graph({
      entity: "order",
      filters: { id: order_id },
      fields: [
        "id",
        "display_id",
        "email",
        "total",
        "subtotal",
        "shipping_total",
        "tax_total",
        "currency_code",
        "items.*",
        "shipping_address.*",
      ],
    })

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    const currencyCode = (order.currency_code || "EUR").toUpperCase()

    const fmt = (cents: number) =>
      Number(cents).toFixed(2).replace(".", ",")

    const itemRows = (order.items || [])
      .map((item: any) => {
        const unitPrice = fmt(Number(item.unit_price || 0))
        const lineTotal = fmt(Number(item.unit_price || 0) * Number(item.quantity || 1))
        return `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #3a3a2a;">
              ${item.title}<br><span style="color: #999; font-size: 13px;">x${item.quantity} à ${unitPrice} ${currencyCode}</span>
            </td>
            <td style="padding: 8px 0; border-bottom: 1px solid #3a3a2a; text-align: right;">
              ${lineTotal} ${currencyCode}
            </td>
          </tr>`
      })
      .join("")

    const subtotal = fmt(Number(order.subtotal || 0))
    const shipping = fmt(Number(order.shipping_total || 0))
    const tax = fmt(Number(order.tax_total || 0))
    const total = fmt(Number(order.total || 0))
    const addr = order.shipping_address

    const isPickup = is_pickup === true || (payment_method || "").toLowerCase() === "bar"
    const isFreeShipping = !isPickup && Number(order.shipping_total || 0) === 0
    const shippingLabel = isPickup ? "Abholung (gratis)" : isFreeShipping ? "Kostenloser Versand" : `${shipping} ${currencyCode}`

    // Payment-specific info block
    let paymentBlock = ""
    const pm = (payment_method || "").toLowerCase()
    if (pm === "paypal") {
      paymentBlock = `
      <div style="background: #275425; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <p style="color: #C5A572; margin: 0 0 4px; font-weight: bold;">✅ Zahlung erhalten</p>
        <p style="color: #FAF8F3; margin: 0; font-size: 14px;">
          Deine Zahlung über PayPal wurde erfolgreich verarbeitet. Wir bereiten deine Bestellung jetzt für den Versand vor.
        </p>
      </div>`
    } else if (pm === "vorkasse") {
      paymentBlock = `
      <div style="background: #275425; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <p style="color: #C5A572; margin: 0 0 4px; font-weight: bold;">Zahlungsinformationen – Vorkasse</p>
        <p style="color: #FAF8F3; margin: 0; font-size: 14px; line-height: 1.7;">
          Bitte überweise den Gesamtbetrag von <strong>${total} ${currencyCode}</strong> an:<br><br>
          <strong>Empfänger:</strong> Girardi M.u.Mitges.<br>
          <strong>IBAN:</strong> AT57 3600 0000 0421 8830<br>
          <strong>BIC:</strong> RZTIAT22<br>
          <strong>Verwendungszweck:</strong> Bestellung #${order.display_id}<br><br>
          Deine Bestellung wird nach Zahlungseingang versendet.
        </p>
      </div>`
    } else if (pm === "bar") {
      paymentBlock = `
      <div style="background: #275425; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <p style="color: #C5A572; margin: 0 0 4px; font-weight: bold;">Barzahlung bei Abholung</p>
        <p style="color: #FAF8F3; margin: 0; font-size: 14px; line-height: 1.7;">
          Bitte bringe den Betrag von <strong>${total} ${currencyCode}</strong> in bar zur Abholung mit.<br><br>
          Wir melden uns bei dir, sobald deine Bestellung abholbereit ist.
        </p>
      </div>`
    } else {
      paymentBlock = `
      <div style="background: #275425; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <p style="color: #C5A572; margin: 0 0 4px; font-weight: bold;">Nächster Schritt</p>
        <p style="color: #FAF8F3; margin: 0; font-size: 14px;">
          Wir melden uns bei dir mit den weiteren Details per E-Mail.
        </p>
      </div>`
    }

    const html = `
    <div style="max-width: 480px; margin: 0 auto; background: #1a1a14; color: #FAF8F3; font-family: Georgia, serif; padding: 32px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #C5A572; margin: 0; font-size: 28px;">The Girardi Oil</h1>
        <p style="color: #7a9a58; margin: 4px 0 0;">1000 Horia</p>
      </div>

      <h2 style="color: #7a9a58; font-size: 22px;">Vielen Dank für deine Bestellung!</h2>
      <p style="margin: 0 0 16px;">Bestellnummer: <strong>#${order.display_id}</strong></p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        ${itemRows}
      </table>

      <table style="width: 100%; font-size: 14px; margin-bottom: 8px;">
        <tr>
          <td style="padding: 4px 0; color: #ccc;">Zwischensumme</td>
          <td style="padding: 4px 0; text-align: right;">${subtotal} ${currencyCode}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #ccc;">Versand</td>
          <td style="padding: 4px 0; text-align: right;">${shippingLabel}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #ccc;">MwSt.</td>
          <td style="padding: 4px 0; text-align: right;">${tax} ${currencyCode}</td>
        </tr>
      </table>

      <p style="font-size: 18px; margin: 16px 0; border-top: 2px solid #C5A572; padding-top: 12px;">
        Gesamtbetrag: <strong style="color: #C5A572;">${total} ${currencyCode}</strong>
      </p>

      ${isPickup ? `
      <h3 style="color: #7a9a58; font-size: 16px; margin: 24px 0 8px;">Rechnungsadresse</h3>
      <p style="margin: 0; line-height: 1.6;">
        ${billing_address?.first_name || addr?.first_name || ""} ${billing_address?.last_name || addr?.last_name || ""}<br>
        ${billing_address?.address_1 || ""}<br>
        ${billing_address?.postal_code || ""} ${billing_address?.city || ""}<br>
        ${(billing_address?.country_code || "").toUpperCase() || ""}
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
      `}

      ${paymentBlock}

      <p style="text-align: center; color: #666; font-size: 13px; margin-top: 24px;">
        The Girardi Oil / 1000 Horia
      </p>
    </div>`

    await sendMail({
      to: order.email,
      subject: `Bestellbestätigung #${order.display_id} – The Girardi Oil`,
      html,
    }).catch((e: any) => console.error("[Customer Mail] Failed:", e.message))

    // Admin notification email (independent of customer email)
    try {
    const ADMIN_EMAIL = "info@thegirardioil.at"
    const pmLabel = pm === "paypal" ? "PayPal" : pm === "vorkasse" ? "Vorkasse (Überweisung)" : pm === "bar" ? "Barzahlung bei Abholung" : pm || "Unbekannt"
    const adminItemRows = (order.items || []).map((item: any) =>
      `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${item.title}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center;">${item.quantity}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">${fmt(Number(item.unit_price || 0) * Number(item.quantity || 1))} ${currencyCode}</td></tr>`
    ).join("")
    const billingAddr = billing_address || {}
    const adminHtml = `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;padding:20px;">
      <h2 style="color:#333;">Neue Bestellung #${order.display_id}</h2>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:6px 0;color:#666;width:140px;">Kunde:</td><td><strong>${addr?.first_name || billingAddr.first_name || ""} ${addr?.last_name || billingAddr.last_name || ""}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666;">E-Mail:</td><td>${order.email}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Zahlungsart:</td><td><strong style="color:${pm === "paypal" ? "#0070ba" : pm === "vorkasse" ? "#d4a017" : "#333"};">${pmLabel}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666;">Versand:</td><td>${shippingLabel}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Gesamtbetrag:</td><td><strong>${total} ${currencyCode}</strong></td></tr>
      </table>
      ${isPickup ? `
      <h3 style="color:#666;font-size:14px;">Rechnungsadresse</h3>
      <p style="margin:0;">${billingAddr.first_name || ""} ${billingAddr.last_name || ""}<br>${billingAddr.address_1 || ""}<br>${billingAddr.postal_code || ""} ${billingAddr.city || ""}<br>${(billingAddr.country_code || "").toUpperCase()}</p>
      <p style="margin:8px 0;color:#d4a017;font-weight:bold;">Abholung in der Werkstatt</p>
      ` : `
      <h3 style="color:#666;font-size:14px;">Liefer- & Rechnungsadresse</h3>
      <p style="margin:0;">${addr?.first_name || ""} ${addr?.last_name || ""}<br>${addr?.address_1 || ""}<br>${addr?.postal_code || ""} ${addr?.city || ""}<br>${addr?.country_code?.toUpperCase() || ""}</p>
      `}
      <h3 style="color:#666;font-size:14px;">Artikel</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr style="background:#f5f5f5;"><th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Artikel</th><th style="padding:6px 8px;border:1px solid #ddd;">Menge</th><th style="padding:6px 8px;border:1px solid #ddd;text-align:right;">Summe</th></tr>
        ${adminItemRows}
      </table>
      ${pm === "vorkasse" ? `<p style="margin-top:16px;padding:12px;background:#fff3cd;border-radius:6px;"><strong>Aktion erforderlich:</strong> Zahlungseingang abwarten, dann Payment im Admin capturen.</p>` : ""}
      ${pm === "bar" ? `<p style="margin-top:16px;padding:12px;background:#fff3cd;border-radius:6px;"><strong>Barzahlung:</strong> Betrag bei Abholung kassieren, dann Payment im Admin capturen.</p>` : ""}
      <p style="margin-top:20px;color:#999;font-size:12px;">
        <a href="https://giradi-backend-svzb.onrender.com/app/orders/${order.id}" style="color:#0070ba;">Order im Admin öffnen →</a>
      </p>
    </div>`

    await sendMail({
      to: ADMIN_EMAIL,
      subject: `Neue Bestellung #${order.display_id} - ${pmLabel} - ${total} ${currencyCode}`,
      html: adminHtml,
    })
    console.log(`✅ Admin email sent to: ${ADMIN_EMAIL}`)
    } catch (adminErr: any) {
      console.error(`❌ [Admin Mail] Failed:`, adminErr.message, adminErr.stack?.slice(0, 200))
    }

    console.log(`✅ Order confirmation email sent to: ${order.email} – Total: ${total} ${currencyCode}`)
    return res.json({ success: true, email_sent: true })
  } catch (error: any) {
    console.error("❌ send-confirmation error:", error)
    return res.status(500).json({ message: error.message })
  }
}