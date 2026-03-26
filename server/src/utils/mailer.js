const nodemailer = require("nodemailer");

const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_SMTP_USER,
      pass: process.env.GMAIL_SMTP_PASS
    }
  });

const getTransporter = () => {
  if (!process.env.GMAIL_SMTP_USER || !process.env.GMAIL_SMTP_PASS) {
    throw new Error("Configuration SMTP Gmail manquante");
  }

  return createTransporter();
};

const sendInvoiceEmail = async ({ to, senderEmail, invoiceNumber, pdfBuffer }) => {
  const transporter = getTransporter();
  return transporter.sendMail({
    from: senderEmail || process.env.DEFAULT_SENDER_EMAIL || "baha3116@gmail.com",
    to,
    subject: `Facture ${invoiceNumber}`,
    text: `Bonjour,\n\nVeuillez trouver ci-jointe votre facture ${invoiceNumber}.\n`,
    attachments: [
      {
        filename: `${invoiceNumber}.pdf`,
        content: pdfBuffer
      }
    ]
  });
};

const sendLoginCodeEmail = async ({ to, code }) => {
  const transporter = getTransporter();
  return transporter.sendMail({
    from: process.env.DEFAULT_SENDER_EMAIL || process.env.GMAIL_SMTP_USER,
    to,
    subject: "Code de connexion AppBoutique",
    text: `Votre code de connexion AppBoutique est ${code}. Il expire dans 10 minutes.`,
    html: `<div style="font-family:Arial,sans-serif;padding:16px;"><h2>Connexion AppBoutique</h2><p>Votre code de connexion est :</p><div style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0;">${code}</div><p>Ce code expire dans 10 minutes.</p></div>`
  });
};

module.exports = { sendInvoiceEmail, sendLoginCodeEmail };
