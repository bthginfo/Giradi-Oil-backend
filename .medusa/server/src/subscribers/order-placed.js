"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = orderPlacedHandler;
console.log(">>>>>> ORDER-PLACED SUBSCRIBER MODULE LOADED <<<<<<");
async function orderPlacedHandler({ event, container, }) {
    console.log("========== ORDER PLACED SUBSCRIBER FIRED ==========");
    console.log("Event data:", JSON.stringify(event.data));
    try {
        const query = container.resolve("query");
        const { data: [order] } = await query.graph({
            entity: "order",
            fields: [
                "id",
                "display_id",
                "email",
                "total",
                "currency_code",
                "items.*",
                "shipping_address.*",
            ],
            filters: { id: event.data.id },
        });
        console.log("Order found:", !!order);
        console.log("Order email:", order?.email);
        if (!order || !order.email) {
            console.log("No order or email found, skipping");
            return;
        }
        console.log("RESEND_API_KEY set:", !!process.env.RESEND_API_KEY);
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: "Bearer " + process.env.RESEND_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
                to: order.email,
                subject: "Bestellbestätigung #" + order.display_id + " - The Girardi Oil",
                html: "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #FAF8F3; padding: 40px;\"><h1 style=\"color: #275425;\">Vielen Dank!</h1><p>Bestellnummer: <strong>#" + order.display_id + "</strong></p><p>Gesamtbetrag: <strong>" + (Number(order.total) / 100).toFixed(2) + " EUR</strong></p><p>Wir melden uns bei dir mit den Zahlungsinformationen.</p></div>",
            }),
        });
        const result = await res.json();
        console.log("Resend result:", JSON.stringify(result));
    }
    catch (error) {
        console.error("========== SUBSCRIBER ERROR ==========", error);
    }
}
exports.config = {
    event: "order.placed",
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3JkZXItcGxhY2VkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3N1YnNjcmliZXJzL29yZGVyLXBsYWNlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFJQSxxQ0FxREM7QUF2REQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxREFBcUQsQ0FBQyxDQUFBO0FBRW5ELEtBQUssVUFBVSxrQkFBa0IsQ0FBQyxFQUMvQyxLQUFLLEVBQ0wsU0FBUyxHQUNzQjtJQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLHFEQUFxRCxDQUFDLENBQUE7SUFDbEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUV0RCxJQUFJLENBQUM7UUFDSCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRXhDLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQztZQUMxQyxNQUFNLEVBQUUsT0FBTztZQUNmLE1BQU0sRUFBRTtnQkFDTixJQUFJO2dCQUNKLFlBQVk7Z0JBQ1osT0FBTztnQkFDUCxPQUFPO2dCQUNQLGVBQWU7Z0JBQ2YsU0FBUztnQkFDVCxvQkFBb0I7YUFDckI7WUFDRCxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUU7U0FDL0IsQ0FBQyxDQUFBO1FBRUYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3BDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV6QyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLENBQUMsQ0FBQTtZQUNoRCxPQUFNO1FBQ1IsQ0FBQztRQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFFaEUsTUFBTSxHQUFHLEdBQUcsTUFBTSxLQUFLLENBQUMsK0JBQStCLEVBQUU7WUFDdkQsTUFBTSxFQUFFLE1BQU07WUFDZCxPQUFPLEVBQUU7Z0JBQ1AsYUFBYSxFQUFFLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWM7Z0JBQ3JELGNBQWMsRUFBRSxrQkFBa0I7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLElBQUksdUJBQXVCO2dCQUM5RCxFQUFFLEVBQUUsS0FBSyxDQUFDLEtBQUs7Z0JBQ2YsT0FBTyxFQUFFLHNCQUFzQixHQUFHLEtBQUssQ0FBQyxVQUFVLEdBQUcsb0JBQW9CO2dCQUN6RSxJQUFJLEVBQUUsMExBQTBMLEdBQUcsS0FBSyxDQUFDLFVBQVUsR0FBRyx3Q0FBd0MsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLHFGQUFxRjthQUNoWSxDQUFDO1NBQ0gsQ0FBQyxDQUFBO1FBRUYsTUFBTSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDL0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ2hFLENBQUM7QUFDSCxDQUFDO0FBRVksUUFBQSxNQUFNLEdBQXFCO0lBQ3RDLEtBQUssRUFBRSxjQUFjO0NBQ3RCLENBQUEifQ==