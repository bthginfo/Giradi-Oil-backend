"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = orderPlacedHandler;
async function orderPlacedHandler({ event, container }) {
  console.log("[Subscriber] order.placed fired - SKIPPED (frontend handles email) - order:", event.data.id);
}
exports.config = { event: "order.placed" };
