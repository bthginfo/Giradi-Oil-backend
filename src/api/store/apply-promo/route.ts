import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * Custom promo code route with quantity validation.
 * POST /store/apply-promo
 * Body: { cart_id, promo_codes: string[] }
 */

// Promo rules: code -> validation function
const PROMO_RULES: Record<string, (items: any[]) => string | null> = {
  SPRING25: (items) => {
    const totalQty = items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)
    if (totalQty < 4) {
      return `SPRING25 gilt erst ab 4 Artikeln. Du hast ${totalQty} Artikel im Warenkorb.`
    }
    return null
  },
  OIL49: (items) => {
    const oilItem = items.find(
      (i: any) => i.product_id === "prod_01KKHV2Q2KW07626GS9C3G9842"
    )
    const oilQty = oilItem?.quantity || 0
    if (oilQty < 3) {
      return `OIL49 gilt nur bei mindestens 3× BIO-Olivenöl Extra Nativ 1L. Du hast ${oilQty}× im Warenkorb.`
    }
    return null
  },
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { cart_id, promo_codes } = req.body as {
    cart_id?: string
    promo_codes?: string[]
  }

  if (!cart_id || !promo_codes?.length) {
    return res.status(400).json({ message: "cart_id and promo_codes are required" })
  }

  try {
    const query = req.scope.resolve("query")
    const {
      data: [cart],
    } = await query.graph({
      entity: "cart",
      filters: { id: cart_id },
      fields: ["id", "items.*", "items.product_id"],
    })

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" })
    }

    // Validate each promo code
    for (const code of promo_codes) {
      const rule = PROMO_RULES[code.toUpperCase()]
      if (rule) {
        const error = rule(cart.items || [])
        if (error) {
          return res.status(400).json({ type: "invalid_data", message: error })
        }
      }
    }

    // All validations passed – apply via Medusa's internal workflow
    const cartModuleService = req.scope.resolve("cart")
    const promotionModuleService = req.scope.resolve("promotion")

    // Resolve promotion IDs from codes
    const promotions = await promotionModuleService.listPromotions({
      code: promo_codes.map((c: string) => c.toUpperCase()),
    })

    if (!promotions.length) {
      return res.status(400).json({
        type: "invalid_data",
        message: `Der Promotion-Code ${promo_codes[0]} ist ungültig.`,
      })
    }

    // Use the store API internally by forwarding to the cart promotions endpoint
    // We need to use the workflow approach
    const { addPromotionsToCartWorkflow } = await import(
      "@medusajs/medusa/core-flows"
    )

    await addPromotionsToCartWorkflow(req.scope).run({
      input: {
        cart_id,
        promo_codes: promo_codes.map((c: string) => c.toUpperCase()),
      },
    })

    // Fetch updated cart to return
    const {
      data: [updatedCart],
    } = await query.graph({
      entity: "cart",
      filters: { id: cart_id },
      fields: [
        "id",
        "total",
        "subtotal",
        "discount_total",
        "discount_subtotal",
        "item_total",
        "shipping_total",
        "tax_total",
        "items.*",
        "promotions.*",
        "promotions.application_method.*",
      ],
    })

    return res.status(200).json({ cart: updatedCart })
  } catch (err: any) {
    console.error("[ApplyPromo] Error:", err.message)
    return res.status(500).json({
      type: "error",
      message: err.message || "Fehler beim Anwenden des Promotion-Codes.",
    })
  }
}
