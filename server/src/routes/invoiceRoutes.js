const express = require("express");
const asyncHandler = require("express-async-handler");
const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const { protect } = require("../middleware/authMiddleware");
const { generateInvoicePdfBuffer } = require("../utils/pdf");
const { sendInvoiceEmail } = require("../utils/mailer");

const router = express.Router();

const buildInvoicePayload = (body) => {
  const subtotal = body.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
  const tax = Number(body.tax || 0);
  return {
    ...body,
    items: body.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      total: Number(item.quantity) * Number(item.unitPrice)
    })),
    subtotal,
    tax,
    total: subtotal + tax
  };
};

router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const invoices = await Invoice.find().populate("customer", "name email phone").sort({ createdAt: -1 });
    res.json(invoices);
  })
);

router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const payload = buildInvoicePayload(req.body);
    const invoice = await Invoice.create({
      ...payload,
      invoiceNumber: req.body.invoiceNumber || `FAC-${Date.now()}`,
      senderEmail: req.body.senderEmail || process.env.DEFAULT_SENDER_EMAIL || "baha3116@gmail.com"
    });
    res.status(201).json(await invoice.populate("customer", "name email phone"));
  })
);

router.put(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const payload = buildInvoicePayload(req.body);
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true }).populate(
      "customer",
      "name email phone"
    );
    if (!invoice) {
      res.status(404);
      throw new Error("Facture introuvable");
    }
    res.json(invoice);
  })
);

router.delete(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      res.status(404);
      throw new Error("Facture introuvable");
    }
    await invoice.deleteOne();
    res.json({ message: "Facture supprimee" });
  })
);

router.get(
  "/:id/pdf",
  protect,
  asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id).populate("customer", "name email phone");
    if (!invoice) {
      res.status(404);
      throw new Error("Facture introuvable");
    }
    const pdfBuffer = await generateInvoicePdfBuffer(invoice, invoice.customer);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=${invoice.invoiceNumber}.pdf`);
    res.send(pdfBuffer);
  })
);

router.post(
  "/:id/send",
  protect,
  asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id).populate("customer", "name email phone");
    if (!invoice) {
      res.status(404);
      throw new Error("Facture introuvable");
    }
    const customer = await Customer.findById(invoice.customer._id);
    if (!customer?.email) {
      res.status(400);
      throw new Error("Le client n'a pas d'email");
    }

    const pdfBuffer = await generateInvoicePdfBuffer(invoice, customer);
    await sendInvoiceEmail({
      to: customer.email,
      senderEmail: req.body.senderEmail || invoice.senderEmail,
      invoiceNumber: invoice.invoiceNumber,
      pdfBuffer
    });

    invoice.status = "sent";
    invoice.senderEmail = req.body.senderEmail || invoice.senderEmail;
    await invoice.save();

    res.json({ message: "Facture envoyee", invoice });
  })
);

module.exports = router;
