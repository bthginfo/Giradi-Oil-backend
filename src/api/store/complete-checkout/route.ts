import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"

/**
 * All-in-one checkout endpoint.
 * Creates payment collection + session, authorizes payment, and completes cart
 * in a single request to minimise frontend round-trips.
 *
 * POST /store/complete-checkout
 * Body: { cart_id: string }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { cart_id } = req.body as { cart_id: string }

  if (!cart_id) {
    return res.status(400).json({ message: "cart_id is required" })
  }

  try {
    const query = req.scope.resolve("query")
    const { data: [cart] } = await query.graph({
      entity: "cart",
      filters: { id: cart_id },
      fields: [
        "id",
        "email",
        "currency_code",
        "total",
        "subtotal",
        "shipping_total",
        "items.*",
        "shipping_address.*",
        "billing_address.*",
        "shipping_methods.*",
        "payment_collection.*",
        "payment_collection.payment_sessions.*",
      ],
    })

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" })
    }

    // Validate basic prerequisites
    const errors: string[] = []
    if (!cart.email) errors.push("Email is missing")
    if (!cart.items?.length) errors.push("Cart has no items")
    if (!cart.shipping_methods?.length) errors.push("No shipping method selected")

    if (errors.length > 0) {
      return res.status(400).json({ message: "Cart is not ready for completion", errors })
    }

    // ---- Step 1: Ensure payment collection exists ----
    let paymentCollectionId = cart.payment_collection?.id
    if (!paymentCollectionId) {
      console.log("[CustomCheckout] Creating payment collection for cart", cart_id)
      const PORT = process.env.PORT || 9000
      const pcRes = await globalThis.fetch(
        `http://localhost:${PORT}/store/payment-collections`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key": req.headers["x-publishable-api-key"] as string || "",
          },
          body: JSON.stringify({ cart_id }),
        }
      )
      if (!pcRes.ok) {
        const err = await pcRes.json().catch(() => ({}))
        return res.status(400).json({ message: "Failed to create payment collection", error: err })
      }
      const pcData = await pcRes.json() as any
      paymentCollectionId = pcData.payment_collection?.id
      if (!paymentCollectionId) {
        return res.status(400).json({ message: "Payment collection creation returned no ID" })
      }
    }

    // ---- Step 2: Ensure payment session exists ----
    let paymentSession = cart.payment_collection?.payment_sessions?.[0]
    if (!paymentSession) {
      console.log("[CustomCheckout] Creating payment session for collection", paymentCollectionId)
      const PORT = process.env.PORT || 9000
      const psRes = await globalThis.fetch(
        `http://localhost:${PORT}/store/payment-collections/${paymentCollectionId}/payment-sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key": req.headers["x-publishable-api-key"] as string || "",
          },
          body: JSON.stringify({ provider_id: "pp_system_default" }),
        }
      )
      if (!psRes.ok) {
        const err = await psRes.json().catch(() => ({}))
        return res.status(400).json({ message: "Failed to create payment session", error: err })
      }
      const psData = await psRes.json() as any
      paymentSession = psData.payment_collection?.payment_sessions?.[0]
      if (!paymentSession) {
        return res.status(400).json({ message: "Payment session creation returned no session" })
      }
    }

    // ---- Step 3: Authorize payment session if pending ----
    if (paymentSession.status === "pending") {
      try {
        const paymentModuleService = req.scope.resolve("payment") as any
        await paymentModuleService.authorizePaymentSession(paymentSession.id, {})
        console.log(`[CustomCheckout] Authorized payment session ${paymentSession.id}`)
      } catch (authErr: any) {
        console.error("[CustomCheckout] Failed to authorize payment:", authErr.message)
        return res.status(400).json({
          message: "Payment authorization failed",
          error: authErr.message,
        })
      }
    }

    // ---- Step 4: Complete cart → create order ----
    const { result } = await completeCartWorkflow(req.scope).run({
      input: { id: cart_id },
    })

    console.log(`[CustomCheckout] Order created:`, result)

    return res.status(200).json({
      type: "order",
      order: result,
    })
  } catch (err: any) {
    console.error("[CustomCheckout] Error:", err.message, err.stack?.slice(0, 500))
    return res.status(500).json({
      type: "error",
      message: err.message || "Checkout failed",
      code: err.code,
    })
  }
}
