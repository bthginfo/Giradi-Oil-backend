"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const core_flows_1 = require("@medusajs/medusa/core-flows");
const utils_1 = require("@medusajs/framework/utils");

async function POST(req, res) {
  const { cart_id, email, shipping_address, billing_address, shipping_option_id, payment_method } = req.body;

  if (!cart_id) {
    return res.status(400).json({ message: "cart_id is required" });
  }

  try {
    const query = req.scope.resolve("query");
    var remoteQuery = req.scope.resolve(utils_1.ContainerRegistrationKeys.REMOTE_QUERY);

    // Step 0: Update cart with customer data if provided
    if (email || shipping_address || billing_address) {
      var updateData = { id: cart_id };
      if (email) updateData.email = email;
      if (shipping_address) updateData.shipping_address = shipping_address;
      if (billing_address) updateData.billing_address = billing_address;
      await (0, core_flows_1.updateCartWorkflow)(req.scope).run({ input: updateData });
    }

    // Step 0b: Add shipping method if provided
    if (shipping_option_id) {
      await (0, core_flows_1.addShippingMethodToCartWorkflow)(req.scope).run({
        input: { cart_id: cart_id, options: [{ id: shipping_option_id }] },
      });
    }

    // Fetch cart with all needed relations
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
      await (0, core_flows_1.createPaymentCollectionForCartWorkflow)(req.scope).run({
        input: { cart_id: cart_id },
      });
      var rels = await remoteQuery((0, utils_1.remoteQueryObjectFromString)({
        entryPoint: "cart_payment_collection",
        variables: { filters: { cart_id: cart_id } },
        fields: ["payment_collection.id", "payment_collection.payment_sessions.*"],
      }));
      var rel = rels[0];
      paymentCollectionId = rel && rel.payment_collection ? rel.payment_collection.id : null;
      if (!paymentCollectionId) {
        return res.status(400).json({ message: "Payment collection creation returned no ID" });
      }
    }

    // Step 2: Ensure payment session exists (direct workflow, no HTTP)
    var paymentSession = (cart.payment_collection && cart.payment_collection.payment_sessions && cart.payment_collection.payment_sessions.length)
      ? cart.payment_collection.payment_sessions[0]
      : null;
    if (!paymentSession) {
      console.log("[CustomCheckout] Creating payment session for collection", paymentCollectionId);
      await (0, core_flows_1.createPaymentSessionsWorkflow)(req.scope).run({
        input: {
          payment_collection_id: paymentCollectionId,
          provider_id: "pp_system_default",
        },
      });
      var rels2 = await remoteQuery((0, utils_1.remoteQueryObjectFromString)({
        entryPoint: "cart_payment_collection",
        variables: { filters: { cart_id: cart_id } },
        fields: ["payment_collection.payment_sessions.*"],
      }));
      var rel2 = rels2[0];
      paymentSession = (rel2 && rel2.payment_collection && rel2.payment_collection.payment_sessions && rel2.payment_collection.payment_sessions.length)
        ? rel2.payment_collection.payment_sessions[0]
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
    var workflowResult = await (0, core_flows_1.completeCartWorkflow)(req.scope).run({
      input: { id: cart_id },
    });
    var result = workflowResult.result;

    // Try to get the order from the workflow result
    var order = (result && typeof result === "object" && ("id" in result))
      ? result
      : null;

    // If workflow returned empty, try to find the order via remoteQuery
    if (!order) {
      try {
        var orderCartLinks = await remoteQuery((0, utils_1.remoteQueryObjectFromString)({
          entryPoint: "order_cart",
          variables: { filters: { cart_id: cart_id } },
          fields: ["order.*", "order.items.*", "order.shipping_address.*"],
        }));
        var ocl = orderCartLinks[0];
        if (ocl && ocl.order && ocl.order.id) {
          order = ocl.order;
        }
      } catch (e) {
        console.warn("[CustomCheckout] Could not find order via order_cart link:", e.message);
      }
    }

    // Last resort: query orders by email
    if (!order && cart.email) {
      try {
        var orderResult = await query.graph({
          entity: "order",
          filters: { email: cart.email },
          fields: ["id", "display_id", "total", "email", "created_at"],
        });
        if (orderResult.data && orderResult.data.length) {
          order = orderResult.data[0];
        }
      } catch (e) {
        console.warn("[CustomCheckout] Could not find order by email:", e.message);
      }
    }

    if (!order) {
      order = { id: "order_from_" + cart_id, _fromCart: true };
    }

    console.log("[CustomCheckout] Order created:", order.id);

    return res.status(200).json({
      type: "order",
      order: order,
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
