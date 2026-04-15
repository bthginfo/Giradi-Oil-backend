"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = debugHandler;
console.log(">>>>>> DEBUG ALL-EVENTS SUBSCRIBER LOADED <<<<<<");
async function debugHandler({ event }) {
    console.log(">>>>>> EVENT:", event.name, "DATA:", JSON.stringify(event.data).substring(0, 300));
}
exports.config = {
    event: [
        "order.placed",
        "order.created",
        "order.completed",
        "order.updated",
        "cart.completed",
        "cart.updated",
        "LinkOrderCart",
        "exec:complete-cart-workflow",
    ],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWctYWxsLWV2ZW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9zdWJzY3JpYmVycy9kZWJ1Zy1hbGwtZXZlbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUlBLCtCQUVDO0FBSkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrREFBa0QsQ0FBQyxDQUFBO0FBRWhELEtBQUssVUFBVSxZQUFZLENBQUMsRUFBRSxLQUFLLEVBQXVCO0lBQ3ZFLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUNqRyxDQUFDO0FBRVksUUFBQSxNQUFNLEdBQXFCO0lBQ3RDLEtBQUssRUFBRTtRQUNMLGNBQWM7UUFDZCxlQUFlO1FBQ2YsaUJBQWlCO1FBQ2pCLGVBQWU7UUFDZixnQkFBZ0I7UUFDaEIsY0FBYztRQUNkLGVBQWU7UUFDZiw2QkFBNkI7S0FDOUI7Q0FDRixDQUFBIn0=