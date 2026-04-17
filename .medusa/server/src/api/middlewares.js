"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const medusa_1 = require("@medusajs/medusa");
function handleOptionsRequest(req, res, next) {
    if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
    }
    next();
}
exports.default = (0, medusa_1.defineMiddlewares)({
    routes: [
        {
            matcher: "/store/*",
            method: ["OPTIONS"],
            middlewares: [handleOptionsRequest],
        },
    ],
});
