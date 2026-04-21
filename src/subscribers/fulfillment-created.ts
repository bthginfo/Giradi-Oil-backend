import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendMail } from "../lib/mailer"
import { ContainerRegistrationKeys, remoteQueryObjectFromString } from "@medusajs/framework/utils"


export default async function fulfillmentCreatedHandler({
  event,
  container,
}: SubscriberArgs<Record<string, any>>) {
  console.log("📦 [Subscriber] fulfillment.created fired – ALL data:", JSON.stringify(event.data))
  console.log("📦 [Subscriber] fulfillment.created – ALL event keys:", Object.keys(event))

  try {
    const query = container.resolve("query")
    const fulfillmentId = event.data.id
    let orderId: string | null = (event.data as any).order_id || null

    // Strategy 1: order_id directly in event
    if (orderId) {
      console.log("[Fulfillment] Got order_id from event:", orderId)
    }

    // Strategy 2: Query fulfillment entity for order link
    if (!orderId) {
      try {
        const { data: [f] } = await query.graph({
          entity: "fulfillment",
          filters: { id: fulfillmentId },
          fields: ["id", "order.id", "order.display_id"],
        })
        if ((f as any)?.order?.id) {
          orderId = (f as any).order.id
          console.log("[Fulfillment] Got order_id from fulfillment.order:", orderId)
        }
      } catch (e: any) {
        console.log("[Fulfillment] Strategy 2 failed:", e.message)
      }
    }

    // Strategy 3: Remote query order_fulfillment link
    if (!orderId) {
      try {
        const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
        const links = await remoteQuery(remoteQueryObjectFromString({
          entryPoint: "order_fulfillment",
          variables: { filters: { fulfillment_id: fulfillmentId } },
          fields: ["order_id", "order.*"],
        }))
        if (links?.[0]?.order_id) {
          orderId = links[0].order_id
          console.log("[Fulfillment] Got order_id from remote query link:", orderId)
        }
      } catch (e: any) {
        console.log("[Fulfillment] Strategy 3 failed:", e.message)
      }
    }

    // Strategy 4: Search all recent orders for this fulfillment
    if (!orderId) {
      try {
        const { data: orders } = await query.graph({
          entity: "order",
          fields: ["id", "display_id", "fulfillments.id"],
        })
        for (const o of (orders || [])) {
          const fIds = ((o as any).fulfillments || []).map((f: any) => f.id)
          if (fIds.includes(fulfillmentId)) {
            orderId = o.id
            console.log("[Fulfillment] Got order_id from order scan:", orderId)
            break
          }
        }
      } catch (e: any) {
        console.log("[Fulfillment] Strategy 4 failed:", e.message)
      }
    }

    if (!orderId) {
      console.error("❌ [Fulfillment] Could not find order for fulfillment:", fulfillmentId)
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
  event: "fulfillment.created",
}
