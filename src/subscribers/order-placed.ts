import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendMail } from "../lib/mailer"


export default async function orderPlacedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  // Disabled: Frontend sends the order confirmation email via /send-confirmation
  // with payment-specific content (PayPal, Vorkasse, Bar, pickup info)
  console.log("📧 [Subscriber] order.placed fired – SKIPPED (frontend handles email) – order:", event.data.id)
}

export const config: SubscriberConfig = {
  event: "order.placed",
}