import { defineMiddlewares } from "@medusajs/medusa"
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

/**
 * Handle CORS preflight (OPTIONS) requests before Medusa's
 * publishable-API-key validation can reject them with 400.
 */
function handleOptionsRequest(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  if (req.method === "OPTIONS") {
    res.status(204).end()
    return
  }
  next()
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/*",
      method: ["OPTIONS"],
      middlewares: [handleOptionsRequest],
    },
  ],
})
