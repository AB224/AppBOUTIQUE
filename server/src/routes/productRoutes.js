const express = require("express");
const asyncHandler = require("express-async-handler");
const multer = require("multer");
const XLSX = require("xlsx");
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");
const validateObjectId = require("../middleware/validateObjectId");

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
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getCell = (row, keys, fallback = "") => {
  const key = keys.find((item) => row[item] !== undefined && row[item] !== null && row[item] !== "");
  return key ? row[key] : fallback;
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const sendWorkbook = (res, workbook, filename) => {
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
};

router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const search = String(req.query.q || "").trim().slice(0, 80);
    const query = search
      ? {
          $or: [
            { name: { $regex: escapeRegex(search), $options: "i" } },
            { category: { $regex: escapeRegex(search), $options: "i" } },
            { barcode: { $regex: escapeRegex(search), $options: "i" } }
          ]
        }
      : {};
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  })
);

router.get(
  "/export/excel",
  protect,
  asyncHandler(async (req, res) => {
    const products = await Product.find().sort({ name: 1 });
    const rows = products.map((product) => ({
      nom: product.name,
      categorie: product.category,
      prix_achat: product.purchasePrice,
      prix_vente: product.salePrice,
      stock: product.stock,
      code_barres: product.barcode,
      alerte_stock_faible: product.lowStockAlert
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Produits");
    sendWorkbook(res, workbook, "produits-appboutique.xlsx");
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
    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const name = String(getCell(row, ["nom", "name", "Nom", "Name"])).trim();
      if (!name) continue;

      const barcode = String(getCell(row, ["code_barres", "barcode", "Code-barres", "Code barres"])).trim();
      const payload = {
        name,
        category: String(getCell(row, ["categorie", "category", "Categorie", "Catégorie"], "General")).trim(),
        purchasePrice: toNumber(getCell(row, ["prix_achat", "purchasePrice", "Prix achat"], 0)),
        salePrice: toNumber(getCell(row, ["prix_vente", "salePrice", "Prix vente"], 0)),
        stock: toNumber(getCell(row, ["stock", "Stock"], 0)),
        barcode,
        lowStockAlert: toNumber(getCell(row, ["alerte_stock_faible", "lowStockAlert", "Alerte"], 5), 5)
      };
      const query = barcode ? { barcode } : { name };
      const existing = await Product.findOne(query);
      if (existing) {
        await Product.findByIdAndUpdate(existing._id, payload, { runValidators: true });
        updated += 1;
      } else {
        await Product.create(payload);
        created += 1;
      }
    }

    res.json({ created, updated, total: created + updated });
  })
);

router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  })
);

router.put(
  "/:id",
  protect,
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) {
      res.status(404);
      throw new Error("Produit introuvable");
    }
    res.json(product);
  })
);

router.delete(
  "/:id",
  protect,
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      throw new Error("Produit introuvable");
    }
    await product.deleteOne();
    res.json({ message: "Produit supprime" });
  })
);

module.exports = router;
