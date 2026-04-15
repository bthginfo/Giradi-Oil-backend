"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = debugHandler;
async function debugHandler({ event }) {
    console.log(`🔔 [DEBUG EVENT] ${event.name}`, JSON.stringify(event.data).substring(0, 200));
}
exports.config = {
    event: [
        "order.placed",
        "order.updated",
        "order.canceled",
        "fulfillment.created",
        "fulfillment.updated",
        "shipment.created",
        "payment.captured",
        "payment.updated",
    ],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWctYWxsLWV2ZW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9zdWJzY3JpYmVycy9kZWJ1Zy1hbGwtZXZlbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLCtCQUVDO0FBRmMsS0FBSyxVQUFVLFlBQVksQ0FBQyxFQUFFLEtBQUssRUFBMkM7SUFDM0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUM3RixDQUFDO0FBRVksUUFBQSxNQUFNLEdBQXFCO0lBQ3RDLEtBQUssRUFBRTtRQUNMLGNBQWM7UUFDZCxlQUFlO1FBQ2YsZ0JBQWdCO1FBQ2hCLHFCQUFxQjtRQUNyQixxQkFBcUI7UUFDckIsa0JBQWtCO1FBQ2xCLGtCQUFrQjtRQUNsQixpQkFBaUI7S0FDbEI7Q0FDRixDQUFBIn0=