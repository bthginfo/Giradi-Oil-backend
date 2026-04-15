"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
async function POST(req, res) {
    console.log("========== SEND-CONFIRMATION CALLED ==========");
    const { order_id, email } = req.body;
    if (!order_id && !email) {
        console.log("No order_id or email provided");
        return res.status(400).json({ error: "order_id or email required" });
    }
    console.log("Order ID:", order_id, "| Email:", email);
    console.log("RESEND_API_KEY set:", !!process.env.RESEND_API_KEY);
    try {
        const query = req.scope.resolve("query");
        let order = null;
        if (order_id) {
            const { data: [found] } = await query.graph({
                entity: "order",
                fields: ["id", "display_id", "email", "total", "currency_code", "items.*", "shipping_address.*"],
                filters: { id: order_id },
            });
            order = found;
        }
        if (!order && email) {
            console.log("Looking up most recent order for email:", email);
            const { data: orders } = await query.graph({
                entity: "order",
                fields: ["id", "display_id", "email", "total", "currency_code", "items.*", "shipping_address.*"],
                filters: { email },
            });
            if (orders?.length) {
                order = orders.sort((a, b) => (b.display_id || 0) - (a.display_id || 0))[0];
                console.log("Found order by email:", order.id, "display_id:", order.display_id);
            }
        }
        if (!order || !order.email) {
            console.log("Order not found");
            return res.status(404).json({ error: "Order not found" });
        }
        console.log("Sending email to:", order.email);
        const itemsHtml = (order.items || []).map((item) => "<tr><td style=\"padding: 8px; border-bottom: 1px solid #eee;\">" + item.title + " x" + item.quantity + "</td><td style=\"padding: 8px; border-bottom: 1px solid #eee; text-align: right;\">" + (Number(item.total) / 100).toFixed(2) + " EUR</td></tr>").join("");
        const addr = order.shipping_address;
        const addressHtml = addr
            ? "<p>" + [addr.first_name, addr.last_name].join(" ") + "<br/>" + addr.address_1 + (addr.address_2 ? "<br/>" + addr.address_2 : "") + "<br/>" + addr.postal_code + " " + addr.city + "<br/>" + addr.country_code?.toUpperCase() + "</p>"
            : "";
        const emailHtml = [
            "<div style=\"font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #FAF8F3; padding: 40px;\">",
            "<div style=\"text-align: center; margin-bottom: 30px;\">",
            "<h1 style=\"color: #275425; margin: 0;\">The Girardi Oil</h1>",
            "<p style=\"color: #C5A572; margin: 5px 0;\">1000 Horia</p>",
            "</div>",
            "<h2 style=\"color: #275425;\">Vielen Dank für deine Bestellung!</h2>",
            "<p>Bestellnummer: <strong>#" + order.display_id + "</strong></p>",
            "<table style=\"width: 100%; border-collapse: collapse; margin: 20px 0;\">" + itemsHtml + "</table>",
            "<p style=\"font-size: 18px;\">Gesamtbetrag: <strong>" + (Number(order.total) / 100).toFixed(2) + " EUR</strong></p>",
            "<h3 style=\"color: #275425;\">Lieferadresse</h3>",
            addressHtml,
            "<div style=\"background: #275425; color: white; padding: 20px; margin-top: 30px; border-radius: 8px;\">",
            "<h3 style=\"margin-top: 0; color: #C5A572;\">Nächster Schritt</h3>",
            "<p style=\"margin-bottom: 0;\">Wir melden uns bei dir mit den Zahlungsinformationen per E-Mail.</p>",
            "</div>",
            "<p style=\"color: #888; font-size: 12px; margin-top: 30px; text-align: center;\">The Girardi Oil / 1000 Horia</p>",
            "</div>",
        ].join("");
        const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: "Bearer " + process.env.RESEND_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
                to: order.email,
                subject: "Bestellbestätigung #" + order.display_id + " - The Girardi Oil",
                html: emailHtml,
            }),
        });
        const result = await emailRes.json();
        console.log("Resend response:", JSON.stringify(result));
        return res.json({ success: true, email_sent: true, result });
    }
    catch (error) {
        console.error("Send confirmation error:", error);
        return res.status(500).json({ error: "Failed to send email" });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3N0b3JlL3NlbmQtY29uZmlybWF0aW9uL3JvdXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUEsb0JBaUdDO0FBakdNLEtBQUssVUFBVSxJQUFJLENBQUMsR0FBa0IsRUFBRSxHQUFtQjtJQUNoRSxPQUFPLENBQUMsR0FBRyxDQUFDLGdEQUFnRCxDQUFDLENBQUE7SUFFN0QsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxHQUFHLENBQUMsSUFBNkMsQ0FBQTtJQUU3RSxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDeEIsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO1FBQzVDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsNEJBQTRCLEVBQUUsQ0FBQyxDQUFBO0lBQ3RFLENBQUM7SUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3JELE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7SUFFaEUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDeEMsSUFBSSxLQUFLLEdBQVEsSUFBSSxDQUFBO1FBRXJCLElBQUksUUFBUSxFQUFFLENBQUM7WUFDYixNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsR0FBRyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUM7Z0JBQzFDLE1BQU0sRUFBRSxPQUFPO2dCQUNmLE1BQU0sRUFB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