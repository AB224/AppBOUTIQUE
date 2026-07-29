const express = require("express");
const asyncHandler = require("express-async-handler");
const multer = require("multer");
const XLSX = require("xlsx");
const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const { protect } = require("../middleware/authMiddleware");
const validateObjectId = require("../middleware/validateObjectId");
const { generateInvoicePdfBuffer } = require("../utils/pdf");
const { sendInvoiceEmail } = require("../utils/mailer");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    if (!/\.xlsx?$/i.test(file.originalname)) {
      return callback(new Error("Seuls les fichiers Excel .xlsx/.xls sont acceptes"));
    }
    return callback(null, true);
  }
});

const getCell = (row, keys, fallback = "") => {
  const key = keys.find((item) => row[item] !== undefined && row[item] !== null && row[item] !== "");
  return key ? row[key] : fallback;
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeInvoiceType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return ["achat", "purchase", "facture achat"].includes(normalized) ? "purchase" : "sale";
};
const normalizeStatus = (value) => {
  const status = String(value || "draft").trim().toLowerCase();
  return ["draft", "sent", "paid"].includes(status) ? status : "draft";
};

const sendWorkbook = (res, workbook, filename) => {
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
};

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

router.get(
  "/export/excel",
  protect,
  asyncHandler(async (req, res) => {
    const type = normalizeInvoiceType(req.query.type);
    const invoices = await Invoice.find({ type }).populate("customer", "name email phone").sort({ createdAt: -1 });
    const rows = invoices.flatMap((invoice) =>
      invoice.items.map((item) => ({
        numero_facture: invoice.invoiceNumber,
        type: invoice.type === "purchase" ? "achat" : "vente",
        statut: invoice.status,
        nom_client_ou_fournisseur: invoice.customer?.name || "",
        email: invoice.customer?.email || "",
        telephone: invoice.customer?.phone || "",
        echeance: invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : "",
        email_expediteur: invoice.senderEmail || "",
        description: item.description,
        quantite: item.quantity,
        prix_unitaire: item.unitPrice,
        taxe_facture: invoice.tax,
        total_ligne: item.total,
        total_facture: invoice.total
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), type === "purchase" ? "Achats" : "Ventes");
    sendWorkbook(res, workbook, `factures-${type === "purchase" ? "achats" : "ventes"}-appboutique.xlsx`);
  })
);

router.post(
  "/import/excel",
  protect,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400);
      throw new Error("Fichier Excel manquant");
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellFormula: false, cellHTML: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (rows.length > 1000) {
      res.status(400);
      throw new Error("Import limite a 1000 lignes par fichier");
    }
    const groups = new Map();

    rows.forEach((row, index) => {
      const invoiceNumber =
        String(getCell(row, ["numero_facture", "invoiceNumber", "Facture", "Numero facture"])).trim() ||
        `FAC-IMPORT-${Date.now()}-${index + 1}`;
      const current = groups.get(invoiceNumber) || [];
      current.push(row);
      groups.set(invoiceNumber, current);
    });

    let imported = 0;
    let lines = 0;

    for (const [invoiceNumber, invoiceRows] of groups.entries()) {
      const first = invoiceRows[0];
      const customerName = String(
        getCell(first, ["nom_client_ou_fournisseur", "customerName", "client", "fournisseur"], "Client import")
      ).trim();
      const customerEmail = String(getCell(first, ["email", "customerEmail", "Email"])).trim().toLowerCase();
      const customerPhone = String(getCell(first, ["telephone", "phone", "Telephone"])).trim();
      const customerQuery = customerEmail ? { email: customerEmail } : { name: customerName };
      const customer = await Customer.findOneAndUpdate(
        customerQuery,
        { name: customerName, email: customerEmail, phone: customerPhone },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      const items = invoiceRows
        .map((row) => {
          const quantity = toNumber(getCell(row, ["quantite", "quantity", "Qt"], 1), 1);
          const unitPrice = toNumber(getCell(row, ["prix_unitaire", "unitPrice", "Prix"], 0));
          return {
            description: String(getCell(row, ["description", "Description"], "Ligne importee")).trim(),
            quantity,
            unitPrice,
            total: quantity * unitPrice
          };
        })
        .filter((item) => item.description);

      const payload = buildInvoicePayload({
        invoiceNumber,
        type: normalizeInvoiceType(getCell(first, ["type", "Type"], "sale")),
        customer: customer._id,
        status: normalizeStatus(getCell(first, ["statut", "status"], "draft")),
        dueDate: getCell(first, ["echeance", "dueDate", "Echeance"], undefined) || undefined,
        senderEmail: getCell(first, ["email_expediteur", "senderEmail"], process.env.DEFAULT_SENDER_EMAIL),
        tax: toNumber(getCell(first, ["taxe_facture", "tax", "Taxes"], 0)),
        items
      });

      await Invoice.findOneAndUpdate({ invoiceNumber }, payload, {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
      });
      imported += 1;
      lines += items.length;
    }

    res.json({ imported, lines });
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
  validateObjectId(),
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
  validateObjectId(),
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
  validateObjectId(),
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
  validateObjectId(),
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
