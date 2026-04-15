import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

export default async function debugHandler({ event }: SubscriberArgs<Record<string, unknown>>) {
  console.log(`🔔 [DEBUG EVENT] ${event.name}`, JSON.stringify(event.data).substring(0, 200))
}

export const config: SubscriberConfig = {
  event: [
    "order.placed",
    "order.updated",
    "order.canceled",
    "fulfillment.created",
    "fulfillment.updated",
    "shipment.created",
    "payment.captured",
    "payment.updated",
  ],
}