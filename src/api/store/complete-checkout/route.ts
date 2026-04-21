import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { completeCartWorkflow, createPaymentCollectionForCartWorkflow, createPaymentSessionsWorkflow, updateCartWorkflow, addShippingMethodToCartWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, remoteQueryObjectFromString } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { cart_id, email, shipping_address, billing_address, shipping_option_id, payment_method } = req.body as any
  const t0 = Date.now()
  const timings: Record<string, number> = {}
  const tick = (label: string) => { timings[label] = Date.now() - t0; console.log(`[Checkout] ${label}: ${timings[label]}ms`) }

  if (!cart_id) {
    return res.status(400).json({ message: "cart_id is required" })
  }

  try {
    const query = req.scope.resolve("query")
    const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

    // Step 0: Update cart if data provided
    if (email || shipping_address || billing_address) {
      const updateData: any = { id: cart_id }
      if (email) updateData.email = email
      if (shipping_address) updateData.shipping_address = shipping_address
      if (billing_address) updateData.billing_address = billing_address
      await updateCartWorkflow(req.scope).run({ input: updateData })
      tick("updateCart")
    }

    // Step 0b: Add shipping if provided
    if (shipping_option_id) {
      await addShippingMethodToCartWorkflow(req.scope).run({
        input: { cart_id, options: [{ id: shipping_option_id }] },
      })
      tick("addShipping")
    }

    // Fetch cart
    const { data: [cart] } = await query.graph({
      entity: "cart",
      filters: { id: cart_id },
      fields: [
        "id", "email", "currency_code", "total", "subtotal", "shipping_total",
        "items.*", "shipping_address.*", "billing_address.*",
        "shipping_methods.*", "payment_collection.*",
        "payment_collection.payment_sessions.*",
      ],
    })
    tick("fetchCart")

    if (!cart) return res.status(404).json({ message: "Cart not found" })

    const errors: string[] = []
    if (!cart.email) errors.push("Email is missing")
    if (!cart.items?.length) errors.push("Cart has no items")
    if (!cart.shipping_methods?.length) errors.push("No shipping method selected")
    if (errors.length > 0) return res.status(400).json({ message: "Cart is not ready for completion", errors })

    // Step 1: Payment collection
    let paymentCollectionId = cart.payment_collection?.id
    if (!paymentCollectionId) {
      await createPaymentCollectionForCartWorkflow(req.scope).run({ input: { cart_id } })
      tick("createPayCol")
      const [rel] = await remoteQuery(remoteQueryObjectFromString({
        entryPoint: "cart_payment_collection",
        variables: { filters: { cart_id } },
        fields: ["payment_collection.id", "payment_collection.payment_sessions.*"],
      }))
      paymentCollectionId = rel?.payment_collection?.id
      if (!paymentCollectionId) return res.status(400).json({ message: "Payment collection creation returned no ID" })
      tick("fetchPayCol")
    } else {
      tick("payColExists")
    }

    // Step 2: Payment session
    let paymentSession = cart.payment_collection?.payment_sessions?.[0]
    if (!paymentSession) {
      await createPaymentSessionsWorkflow(req.scope).run({
        input: { payment_collection_id: paymentCollectionId, provider_id: "pp_system_default" },
      })
      tick("createPaySession")
      const [rel] = await remoteQuery(remoteQueryObjectFromString({
        entryPoint: "cart_payment_collection",
        variables: { filters: { cart_id } },
        fields: ["payment_collection.payment_sessions.*"],
      }))
      paymentSession = rel?.payment_collection?.payment_sessions?.[0]
      if (!paymentSession) return res.status(400).json({ message: "Payment session creation returned no session" })
      tick("fetchPaySession")
    } else {
      tick("paySessionExists")
    }

    // Step 3: Authorize
    if (paymentSession.status === "pending") {
      const paymentModuleService = req.scope.resolve("payment") as any
      await paymentModuleService.authorizePaymentSession(paymentSession.id, {})
      tick("authorize")
    } else {
      tick("alreadyAuthorized")
    }

    // Step 4: Complete cart
    const { result } = await completeCartWorkflow(req.scope).run({ input: { id: cart_id } })
    tick("completeCart")

    // Find order
    let order: any = (result && typeof result === "object" && ("id" in result)) ? result : null

    if (!order) {
      try {
        const [ocl] = await remoteQuery(remoteQueryObjectFromString({
          entryPoint: "order_cart",
          variables: { filters: { cart_id } },
          fields: ["order.*", "order.items.*", "order.shipping_address.*"],
        }))
        if (ocl?.order?.id) order = ocl.order
        tick("findOrderByLink")
      } catch (e: any) {
        tick("findOrderByLinkFailed")
      }
    }

    if (!order && cart.email) {
      try {
        const { data: recentOrders } = await query.graph({
          entity: "order",
          filters: { email: cart.email },
          fields: ["id", "display_id", "total", "email", "created_at"],
        })
        if (recentOrders?.length) order = recentOrders[0]
        tick("findOrderByEmail")
      } catch (e: any) {
        tick("findOrderByEmailFailed")
      }
    }

    if (!order) order = { id: `order_from_${cart_id}`, _fromCart: true }

    // Step 5: Auto-capture payment for PayPal
    if (payment_method === "paypal" && order?.id && !order._fromCart) {
      try {
        const { data: [orderWithPayment] } = await query.graph({
          entity: "order",
          filters: { id: order.id },
          fields: ["payment_collections.payments.id"],
        })
        const payments = orderWithPayment?.payment_collections?.flatMap((pc: any) => pc.payments || []) || []
        for (const payment of payments) {
          if (payment.id) {
            const paymentModule = req.scope.resolve("payment") as any
            await paymentModule.capturePayment({ payment_id: payment.id })
            tick("capturePayment")
          }
        }
      } catch (e: any) {
        console.error("[Checkout] capture payment failed:", e.message)
        tick("capturePaymentFailed")
      }
    }

    tick("DONE total")
    console.log(`[Checkout] Order: ${order.id}`)

    return res.status(200).json({ type: "order", order, _timings: timings })
  } catch (err: any) {
    console.error(`[Checkout] ERROR at ${Date.now() - t0}ms:`, err.message, err.stack?.slice(0, 500))
    return res.status(500).json({ type: "error", message: err.message || "Checkout failed", code: err.code })
  }
}
