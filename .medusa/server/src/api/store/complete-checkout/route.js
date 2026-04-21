"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const core_flows_1 = require("@medusajs/medusa/core-flows");
const utils_1 = require("@medusajs/framework/utils");

async function POST(req, res) {
  const { cart_id, email, shipping_address, billing_address, shipping_option_id, payment_method } = req.body;
  const t0 = Date.now();
  const tick = (label) => console.log(`[Checkout] ${label}: ${Date.now() - t0}ms`);

  if (!cart_id) return res.status(400).json({ message: "cart_id is required" });

  try {
    const query = req.scope.resolve("query");
    const remoteQuery = req.scope.resolve(utils_1.ContainerRegistrationKeys.REMOTE_QUERY);

    if (email || shipping_address || billing_address) {
      const updateData = { id: cart_id };
      if (email) updateData.email = email;
      if (shipping_address) updateData.shipping_address = shipping_address;
      if (billing_address) updateData.billing_address = billing_address;
      await (0, core_flows_1.updateCartWorkflow)(req.scope).run({ input: updateData });
      tick("updateCart");
    }

    if (shipping_option_id) {
      await (0, core_flows_1.addShippingMethodToCartWorkflow)(req.scope).run({
        input: { cart_id: cart_id, options: [{ id: shipping_option_id }] },
      });
      tick("addShipping");
    }

    const { data: [cart] } = await query.graph({
      entity: "cart",
      filters: { id: cart_id },
      fields: ["id","email","currency_code","total","subtotal","shipping_total","items.*","shipping_address.*","billing_address.*","shipping_methods.*","payment_collection.*","payment_collection.payment_sessions.*"],
    });
    tick("fetchCart");

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    var errors = [];
    if (!cart.email) errors.push("Email is missing");
    if (!cart.items || !cart.items.length) errors.push("Cart has no items");
    if (!cart.shipping_methods || !cart.shipping_methods.length) errors.push("No shipping method selected");
    if (errors.length > 0) return res.status(400).json({ message: "Cart is not ready for completion", errors: errors });

    var paymentCollectionId = cart.payment_collection ? cart.payment_collection.id : null;
    if (!paymentCollectionId) {
      await (0, core_flows_1.createPaymentCollectionForCartWorkflow)(req.scope).run({ input: { cart_id: cart_id } });
      tick("createPayCol");
      var rels = await remoteQuery((0, utils_1.remoteQueryObjectFromString)({ entryPoint: "cart_payment_collection", variables: { filters: { cart_id: cart_id } }, fields: ["payment_collection.id","payment_collection.payment_sessions.*"] }));
      paymentCollectionId = rels[0] && rels[0].payment_collection ? rels[0].payment_collection.id : null;
      if (!paymentCollectionId) return res.status(400).json({ message: "Payment collection creation returned no ID" });
      tick("fetchPayCol");
    } else { tick("payColExists"); }

    var paymentSession = (cart.payment_collection && cart.payment_collection.payment_sessions && cart.payment_collection.payment_sessions.length) ? cart.payment_collection.payment_sessions[0] : null;
    if (!paymentSession) {
      await (0, core_flows_1.createPaymentSessionsWorkflow)(req.scope).run({ input: { payment_collection_id: paymentCollectionId, provider_id: "pp_system_default" } });
      tick("createPaySession");
      var rels2 = await remoteQuery((0, utils_1.remoteQueryObjectFromString)({ entryPoint: "cart_payment_collection", variables: { filters: { cart_id: cart_id } }, fields: ["payment_collection.payment_sessions.*"] }));
      paymentSession = (rels2[0] && rels2[0].payment_collection && rels2[0].payment_collection.payment_sessions && rels2[0].payment_collection.payment_sessions.length) ? rels2[0].payment_collection.payment_sessions[0] : null;
      if (!paymentSession) return res.status(400).json({ message: "Payment session creation returned no session" });
      tick("fetchPaySession");
    } else { tick("paySessionExists"); }

    if (paymentSession.status === "pending") {
      var paymentModuleService = req.scope.resolve("payment");
      await paymentModuleService.authorizePaymentSession(paymentSession.id, {});
      tick("authorize");
    } else { tick("alreadyAuthorized"); }

    var workflowResult = await (0, core_flows_1.completeCartWorkflow)(req.scope).run({ input: { id: cart_id } });
    tick("completeCart");
    var result = workflowResult.result;
    var order = (result && typeof result === "object" && ("id" in result)) ? result : null;

    if (!order) {
      try {
        var ocls = await remoteQuery((0, utils_1.remoteQueryObjectFromString)({ entryPoint: "order_cart", variables: { filters: { cart_id: cart_id } }, fields: ["order.*","order.items.*","order.shipping_address.*"] }));
        if (ocls[0] && ocls[0].order && ocls[0].order.id) order = ocls[0].order;
        tick("findOrderByLink");
      } catch (e) { tick("findOrderByLinkFailed"); }
    }

    if (!order && cart.email) {
      try {
        var orderResult = await query.graph({ entity: "order", filters: { email: cart.email }, fields: ["id","display_id","total","email","created_at"] });
        if (orderResult.data && orderResult.data.length) order = orderResult.data[0];
        tick("findOrderByEmail");
      } catch (e) { tick("findOrderByEmailFailed"); }
    }

    if (!order) order = { id: "order_from_" + cart_id, _fromCart: true };
    // Step 5: Auto-capture payment for PayPal
    if (payment_method === "paypal" && order && order.id && !order._fromCart) {
      try {
        const { data: [orderWithPayment] } = await query.graph({
          entity: "order",
          filters: { id: order.id },
          fields: ["payment_collections.payments.id"],
        });
        const payments = (orderWithPayment?.payment_collections || []).flatMap((pc) => pc.payments || []);
        for (const payment of payments) {
          if (payment.id) {
            await (0, core_flows_1.capturePaymentWorkflow)(req.scope).run({ input: { payment_id: payment.id } });
            tick("capturePayment");
          }
        }
      } catch (e) {
        console.error("[Checkout] capture payment failed:", e.message);
        tick("capturePaymentFailed");
      }
    }
    tick("DONE total");
    console.log("[Checkout] Order:", order.id);
    return res.status(200).json({ type: "order", order: order });
  } catch (err) {
    console.error("[Checkout] ERROR at " + (Date.now() - t0) + "ms:", err.message, err.stack ? err.stack.slice(0, 500) : "");
    return res.status(500).json({ type: "error", message: err.message || "Checkout failed", code: err.code });
  }
}
