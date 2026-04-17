"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const core_flows_1 = require("@medusajs/medusa/core-flows");

async function POST(req, res) {
  const { cart_id } = req.body;

  if (!cart_id) {
    return res.status(400).json({ message: "cart_id is required" });
  }

  try {
    const query = req.scope.resolve("query");
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
    });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const errors = [];
    if (!cart.email) errors.push("Email is missing");
    if (!cart.items || !cart.items.length) errors.push("Cart has no items");
    if (!cart.shipping_methods || !cart.shipping_methods.length) errors.push("No shipping method selected");
    if (!cart.payment_collection) errors.push("No payment collection");
    if (!cart.payment_collection || !cart.payment_collection.payment_sessions || !cart.payment_collection.payment_sessions.length) errors.push("No payment session");

    if (errors.length > 0) {
      return res.status(400).json({
        message: "Cart is not ready for completion",
        errors,
        cart_state: {
          email: cart.email,
          items: (cart.items && cart.items.length) || 0,
          shipping_methods: (cart.shipping_methods && cart.shipping_methods.length) || 0,
          payment_collection: cart.payment_collection ? cart.payment_collection.id : null,
          payment_sessions: cart.payment_collection && cart.payment_collection.payment_sessions
            ? cart.payment_collection.payment_sessions.map(function(s) {
                return { id: s.id, status: s.status, provider_id: s.provider_id };
              })
            : [],
        },
      });
    }

    // Authorize payment session if pending
    const paymentSession = cart.payment_collection.payment_sessions[0];
    if (paymentSession.status === "pending") {
      try {
        const paymentModuleService = req.scope.resolve("payment");
        await paymentModuleService.authorizePaymentSession(paymentSession.id, {});
        console.log("[CustomCheckout] Authorized payment session " + paymentSession.id);
      } catch (authErr) {
        console.error("[CustomCheckout] Failed to authorize payment:", authErr.message);
        return res.status(400).json({
          message: "Payment authorization failed",
          error: authErr.message,
        });
      }
    }

    // Run complete cart workflow
    const { result } = await (0, core_flows_1.completeCartWorkflow)(req.scope).run({
      input: { id: cart_id },
    });

    console.log("[CustomCheckout] Order created:", result);

    return res.status(200).json({
      type: "order",
      order: result,
    });
  } catch (err) {
    console.error("[CustomCheckout] Error:", err.message, err.stack ? err.stack.slice(0, 500) : "");
    return res.status(500).json({
      type: "error",
      message: err.message || "Checkout failed",
      code: err.code,
    });
  }
}
