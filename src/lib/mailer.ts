import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ionos.de",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "info@thegirardioil.at",
    pass: process.env.SMTP_PASS || "",
  },
})

export async function sendMail(params: {
  to: string
  subject: string
  html: string
}) {
  const from = process.env.SMTP_FROM || "The Girardi Oil <info@thegirardioil.at>"
  await transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  })
}
