import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendMail } from "../lib/mailer"


export default async function fulfillmentCreatedHandler({
  event,
  container,
}: SubscriberArgs<Record<string, any>>) {
  console.log("📦 [Subscriber] order.fulfillment_created fired – data:", JSON.stringify(event.data))

  try {
    const query = container.resolve("query")
    const orderId = (event.data as any).order_id
    const fulfillmentId = (event.data as any).fulfillment_id || event.data.id

    if (!orderId) {
      console.error("❌ [Fulfillment] No order_id in event data")
      return
    }

    // Get fulfillment labels for tracking
    let trackingNumber: string | null = null
    let trackingUrl: string | null = null
    try {
      const { data: [f] } = await query.graph({
        entity: "fulfillment",
        filters: { id: fulfillmentId },
        fields: ["id", "labels.*", "tracking_links.*"],
      })
      const label = (f as any)?.labels?.[0]
      trackingNumber = label?.tracking_number || null
      trackingUrl = label?.tracking_url || null
      if (!trackingNumber) {
        const tl = (f as any)?.tracking_links?.[0]
        trackingNumber = tl?.tracking_number || null
        trackingUrl = tl?.url || null
      }
    } catch (e: any) {
      console.log("[Fulfillment] Could not get tracking info:", e.message)
    }

    // Get order details
    const { data: [order] } = await query.graph({
      entity: "order",
      filters: { id: orderId },
      fields: ["id", "display_id", "email", "currency_code", "items.*", "shipping_address.*"],
    })

    if (!order) {
      console.error("❌ [Fulfillment] Order not found:", orderId)
      return
    }

    const cc = (order.currency_code || "EUR").toUpperCase()
    const fmt = (cents: number) => Number(cents).toFixed(2).replace(".", ",")
    const addr = order.shipping_address as any

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
         </div>`

    const itemRows = (order.items || [])
      .map((item: any) => `<tr>
        <td style="padding:6px 0;border-bottom:1px solid #3a3a2a;">
          ${item.title} <span style="color:#999;font-size:13px;">x${item.quantity}</span>
        </td>
        <td style="padding:6px 0;border-bottom:1px solid #3a3a2a;text-align:right;">
          ${fmt(Number(item.unit_price || 0) * Number(item.quantity || 1))} ${cc}
        </td>
      </tr>`).join("")

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
    </div>`

    await sendMail({
      to: order.email,
      subject: `Deine Bestellung #${order.display_id} wurde versendet – The Girardi Oil`,
      html,
    })

    console.log(`✅ [Fulfillment] Email sent to: ${order.email}`)
  } catch (err: any) {
    console.error("❌ [Fulfillment] Error:", err.message, err.stack?.slice(0, 300))
  }
}

export const config: SubscriberConfig = {
  event: "order.fulfillment_created",
}
