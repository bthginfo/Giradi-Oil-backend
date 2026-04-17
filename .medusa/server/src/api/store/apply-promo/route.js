"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;

const PROMO_RULES = {
  SPRING25: function(items) {
    const totalQty = items.reduce(function(sum, i) { return sum + (i.quantity || 0); }, 0);
    if (totalQty < 4) {
      return "SPRING25 gilt erst ab 4 Artikeln. Du hast " + totalQty + " Artikel im Warenkorb.";
    }
    return null;
  },
  OIL49: function(items) {
    const oilItem = items.find(function(i) { return i.product_id === "prod_01KKHV2Q2KW07626GS9C3G9842"; });
    const oilQty = oilItem ? (oilItem.quantity || 0) : 0;
    if (oilQty < 3) {
      return "OIL49 gilt nur bei mindestens 3x BIO-Olivenoel Extra Nativ 1L. Du hast " + oilQty + "x im Warenkorb.";
    }
    return null;
  }
};

async function POST(req, res) {
  const body = req.body || {};
  const cart_id = body.cart_id;
  const promo_codes = body.promo_codes;

  if (!cart_id || !promo_codes || !promo_codes.length) {
    return res.status(400).json({ message: "cart_id and promo_codes are required" });
  }

  try {
    const query = req.scope.resolve("query");
    const result = await query.graph({
      entity: "cart",
      filters: { id: cart_id },
      fields: ["id", "items.*", "items.product_id"],
    });
    const cart = result.data[0];

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Validate each promo code
    for (const code of promo_codes) {
      const rule = PROMO_RULES[code.toUpperCase()];
      if (rule) {
        const error = rule(cart.items || []);
        if (error) {
          return res.status(400).json({ type: "invalid_data", message: error });
        }
      }
    }

    // All validations passed - apply via workflow
    const { addPromotionsToCartWorkflow } = require("@medusajs/medusa/core-flows");

    await addPromotionsToCartWorkflow(req.scope).run({
      input: {
        cart_id: cart_id,
        promo_codes: promo_codes.map(function(c) { return c.toUpperCase(); }),
      },
    });

    // Fetch updated cart
    const updated = await query.graph({
      entity: "cart",
      filters: { id: cart_id },
      fields: [
        "id", "total", "subtotal", "discount_total", "discount_subtotal",
        "item_total", "shipping_total", "tax_total",
        "items.*", "promotions.*", "promotions.application_method.*",
      ],
    });

    return res.status(200).json({ cart: updated.data[0] });
  } catch (err) {
    console.error("[ApplyPromo] Error:", err.message);
    return res.status(500).json({
      type: "error",
      message: err.message || "Fehler beim Anwenden des Promotion-Codes.",
    });
  }
}
