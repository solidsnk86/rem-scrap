import nodemailer from "nodemailer";
import { buildEmailHtml } from "../../email-template/email-template.js";
import "dotenv/config";

function parseEmailList(value) {
  return String(value || "")
    .split(/[;,]/)
    .map((email) => email.trim())
    .filter(Boolean);
}

export async function sendWeatherEmail(datos, vpsTexto, summarize, subject) {
  const smtpUser = "calcagni.gabriel86@gmail.com";
  const smtpPass = process.env.GMAIL_USER_PASSWORD;
  const mailFrom = smtpUser;
  const mailTo = process.env.MAIL_TO;
  const mailCc = parseEmailList(process.env.MAIL_CC);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const finalSubject =
    subject ||
    `Clima ${datos.Estacion} • Temperatura actual: ${datos.Temperatura}`;

  await transporter.sendMail({
    from: mailFrom,
    to: mailTo,
    cc: mailCc.length ? mailCc : undefined,
    subject: finalSubject,
    text: [
      `Estación: ${datos.Estacion}`,
      `Hora: ${datos.Hora}`,
      `Temperatura: ${datos.Temperatura}`,
      `Humedad: ${datos.Humedad}`,
      `Lluvia (1h): ${datos["Lluvia (1h)"]}`,
      `Lluvia (24h): ${datos["Lluvia (24h)"]}`,
      `Lluvia (30d): ${datos["Lluvia (30d)"]}`,
      `Radiación: ${datos["Rad. Solar"]}`,
      `Temp Max Hoy: ${datos["Temp Max Hoy"]}`,
      `Temp Min Hoy: ${datos["Temp Min Hoy"]}`,
      `VPS (VPD): ${vpsTexto}`,
      "",
      "Resumen:",
      summarize || "Sin resumen disponible.",
      "",
      "Estos datos han sido extraídos de fuentes públicas del gobierno.",
      "Este reporte fue generado automáticamente.",
    ].join("\n"),
    html: buildEmailHtml(datos, vpsTexto, summarize),
  });

  console.log(
    `Correo enviado a ${mailTo}${mailCc.length ? ` con CC a ${mailCc.join(", ")}` : ""}`,
  );
}