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
        "id", "email", "currency_code", "total", "subtotal", "shipping_total",
        "items.*", "shipping_address.*", "billing_address.*",
        "shipping_methods.*", "payment_collection.*",
        "payment_collection.payment_sessions.*",
      ],
    });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    var errors = [];
    if (!cart.email) errors.push("Email is missing");
    if (!cart.items || !cart.items.length) errors.push("Cart has no items");
    if (!cart.shipping_methods || !cart.shipping_methods.length) errors.push("No shipping method selected");

    if (errors.length > 0) {
      return res.status(400).json({ message: "Cart is not ready for completion", errors: errors });
    }

    // Step 1: Ensure payment collection exists
    var paymentCollectionId = cart.payment_collection ? cart.payment_collection.id : null;
    if (!paymentCollectionId) {
      console.log("[CustomCheckout] Creating payment collection for cart", cart_id);
      var PORT = process.env.PORT || 9000;
      var pcRes = await globalThis.fetch(
        "http://localhost:" + PORT + "/store/payment-collections",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key": req.headers["x-publishable-api-key"] || "",
          },
          body: JSON.stringify({ cart_id: cart_id }),
        }
      );
      if (!pcRes.ok) {
        var pcErr = await pcRes.json().catch(function() { return {}; });
        return res.status(400).json({ message: "Failed to create payment collection", error: pcErr });
      }
      var pcData = await pcRes.json();
      paymentCollectionId = pcData.payment_collection ? pcData.payment_collection.id : null;
      if (!paymentCollectionId) {
        return res.status(400).json({ message: "Payment collection creation returned no ID" });
      }
    }

    // Step 2: Ensure payment session exists
    var paymentSession = (cart.payment_collection && cart.payment_collection.payment_sessions && cart.payment_collection.payment_sessions.length)
      ? cart.payment_collection.payment_sessions[0]
      : null;
    if (!paymentSession) {
      console.log("[CustomCheckout] Creating payment session for collection", paymentCollectionId);
      var PORT2 = process.env.PORT || 9000;
      var psRes = await globalThis.fetch(
        "http://localhost:" + PORT2 + "/store/payment-collections/" + paymentCollectionId + "/payment-sessions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key": req.headers["x-publishable-api-key"] || "",
          },
          body: JSON.stringify({ provider_id: "pp_system_default" }),
        }
      );
      if (!psRes.ok) {
        var psErr = await psRes.json().catch(function() { return {}; });
        return res.status(400).json({ message: "Failed to create payment session", error: psErr });
      }
      var psData = await psRes.json();
      paymentSession = (psData.payment_collection && psData.payment_collection.payment_sessions && psData.payment_collection.payment_sessions.length)
        ? psData.payment_collection.payment_sessions[0]
        : null;
      if (!paymentSession) {
        return res.status(400).json({ message: "Payment session creation returned no session" });
      }
    }

    // Step 3: Authorize payment session if pending
    if (paymentSession.status === "pending") {
      try {
        var paymentModuleService = req.scope.resolve("payment");
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

    // Step 4: Complete cart
    var result = (await (0, core_flows_1.completeCartWorkflow)(req.scope).run({
      input: { id: cart_id },
    })).result;

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
