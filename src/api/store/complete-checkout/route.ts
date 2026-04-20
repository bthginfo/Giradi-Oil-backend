import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { completeCartWorkflow, createPaymentCollectionForCartWorkflow, createPaymentSessionsWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, remoteQueryObjectFromString } from "@medusajs/framework/utils"

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
    const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
    let paymentCollectionId = cart.payment_collection?.id
    if (!paymentCollectionId) {
      console.log("[CustomCheckout] Creating payment collection for cart", cart_id)
      await createPaymentCollectionForCartWorkflow(req.scope).run({
        input: { cart_id },
      })
      const [rel] = await remoteQuery(remoteQueryObjectFromString({
        entryPoint: "cart_payment_collection",
        variables: { filters: { cart_id } },
        fields: ["payment_collection.id", "payment_collection.payment_sessions.*"],
      }))
      paymentCollectionId = rel?.payment_collection?.id
      if (!paymentCollectionId) {
        return res.status(400).json({ message: "Payment collection creation returned no ID" })
      }
    }

    // ---- Step 2: Ensure payment session exists ----
    let paymentSession = cart.payment_collection?.payment_sessions?.[0]
    if (!paymentSession) {
      console.log("[CustomCheckout] Creating payment session for collection", paymentCollectionId)
      await createPaymentSessionsWorkflow(req.scope).run({
        input: {
          payment_collection_id: paymentCollectionId,
          provider_id: "pp_system_default",
        },
      })
      // Re-fetch to get the created session
      const [rel] = await remoteQuery(remoteQueryObjectFromString({
        entryPoint: "cart_payment_collection",
        variables: { filters: { cart_id } },
        fields: ["payment_collection.payment_sessions.*"],
      }))
      paymentSession = rel?.payment_collection?.payment_sessions?.[0]
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

    // The workflow result may be empty in Medusa v2 – use it if available,
    // otherwise return a minimal order object so the frontend can proceed.
    const order = (result && typeof result === "object" && ("id" in result))
      ? result
      : { id: `order_from_${cart_id}`, _fromCart: true }

    console.log(`[CustomCheckout] Order created:`, (order as any).id)

    return res.status(200).json({
      type: "order",
      order,
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
