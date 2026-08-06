const express = require("express");
const asyncHandler = require("express-async-handler");
const multer = require("multer");
const readXlsxFile = require("read-excel-file/node");
const writeXlsxFile = require("write-excel-file/node");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const { protect } = require("../middleware/authMiddleware");
const mongoose = require("mongoose");

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
  if (key) return row[key];

  const normalizedRow = Object.entries(row).reduce((current, [rowKey, value]) => {
    current[normalizeKey(rowKey)] = value;
    return current;
  }, {});
  const normalizedKey = keys.find((item) => {
    const value = normalizedRow[normalizeKey(item)];
    return value !== undefined && value !== null && value !== "";
  });

  return normalizedKey ? normalizedRow[normalizeKey(normalizedKey)] : fallback;
};

const toNumber = (value, fallback = 0) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  let normalized = String(value || "")
    .trim()
    .replace(/\s/g, "");
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replace(/,/g, "");
  } else if (normalized.includes(",") && !normalized.includes(".")) {
    normalized = normalized.replace(/,/g, ".");
  }
  const number = Number(normalized);
  return Number.isFinite(number) ? number : fallback;
};

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const rowsToObjects = (rows) => {
  const headers = (rows[0] || []).map((header) => String(header || "").trim());
  return rows.slice(1).map((row) =>
    headers.reduce((item, header, index) => {
      if (header) item[header] = row[index] ?? "";
      return item;
    }, {})
  );
};

const getImportRows = (workbook) => {
  if (!Array.isArray(workbook)) {
    return [];
  }

  if (workbook[0]?.data) {
    const importableSheets = workbook.filter((sheet) => {
      const rows = rowsToObjects(sheet.data || []);
      return rows.some((row) => {
        const name = getCell(row, ["nom", "name", "produit", "Produit"]);
        const barcode = getCell(row, ["code_barres", "barcode", "Code-barres", "Code barres"]);
        const quantity = getCell(row, ["quantite", "quantity", "Quantite"]);
        const stock = getCell(row, ["stock_actuel", "stock", "Stock"]);
        return (name || barcode) && (quantity !== "" || stock !== "");
      });
    });
    const importSheet =
      importableSheets.find((sheet) => String(sheet.sheet || "").toLowerCase().includes("modele import")) ||
      importableSheets.find((sheet) => String(sheet.sheet || "").toLowerCase().includes("stock")) ||
      importableSheets[0];
    return importSheet?.data || [];
  }

  return workbook;
};

const buildWorkbookBuffer = (sheets) =>
  writeXlsxFile(
    sheets.map((sheet) => ({ sheet: sheet.name, data: sheet.data })),
    { buffer: true }
  ).toBuffer();

const sheetRows = (rows, fallbackColumns) => {
  const headers = Object.keys(rows[0] || fallbackColumns);
  return [
    headers.map((header) => ({ value: header, fontWeight: "bold" })),
    ...rows.map((row) => headers.map((header) => ({ value: row[header] ?? "" })))
  ];
};

const normalizeMovementType = (value) => {
  const type = String(value || "restock").trim().toLowerCase();
  return ["restock", "adjustment", "return"].includes(type) ? type : "restock";
};

const sendExcel = (res, buffer, filename) => {
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
};

router.get(
  "/movements",
  protect,
  asyncHandler(async (req, res) => {
    const movements = await StockMovement.find()
      .populate("product", "name category barcode")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });
    res.json(movements);
  })
);

router.get(
  "/export/excel",
  protect,
  asyncHandler(async (req, res) => {
    const [products, movements] = await Promise.all([
      Product.find().sort({ name: 1 }),
      StockMovement.find()
        .populate("product", "name category barcode stock")
        .populate("createdBy", "name")
        .sort({ createdAt: -1 })
    ]);

    const stockRows = products.map((product) => ({
      nom: product.name,
      categorie: product.category,
      stock_actuel: product.stock,
      code_barres: product.barcode,
      alerte_stock_faible: product.lowStockAlert,
      prix_achat: product.purchasePrice,
      prix_vente: product.salePrice
    }));
    const movementRows = movements.map((movement) => ({
      date: movement.createdAt.toISOString(),
      produit: movement.product?.name || "",
      categorie: movement.product?.category || "",
      code_barres: movement.product?.barcode || "",
      type: movement.type,
      quantite: movement.quantity,
      note: movement.note,
      utilisateur: movement.createdBy?.name || ""
    }));
    const importTemplateRows = [
      {
        code_barres: "",
        nom: "",
        type: "restock",
        quantite: 1,
        stock_actuel: "",
        prix_achat: "",
        prix_vente: "",
        note: "Ajout via Excel"
      }
    ];
    const buffer = await buildWorkbookBuffer([
      {
        name: "Stock actuel",
        data: sheetRows(stockRows, {
          nom: "",
          categorie: "",
          stock_actuel: "",
          code_barres: "",
          alerte_stock_faible: "",
          prix_achat: "",
          prix_vente: ""
        })
      },
      {
        name: "Mouvements",
        data: sheetRows(movementRows, {
          date: "",
          produit: "",
          categorie: "",
          code_barres: "",
          type: "",
          quantite: "",
          note: "",
          utilisateur: ""
        })
      },
      {
        name: "Modele import",
        data: sheetRows(importTemplateRows, {
          code_barres: "",
          nom: "",
          type: "",
          quantite: "",
          stock_actuel: "",
          prix_achat: "",
          prix_vente: "",
          note: ""
        })
      }
    ]);
    sendExcel(res, buffer, "stock-appboutique.xlsx");
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

    let workbook;
    try {
      workbook = await readXlsxFile(req.file.buffer, { getSheets: true });
    } catch (error) {
      res.status(400);
      throw new Error("Fichier Excel illisible. Exporte le modele depuis l'onglet Stocks puis reimporte un fichier .xlsx.");
    }

    const rows = rowsToObjects(getImportRows(workbook));
    if (!rows.length) {
      res.status(400);
      throw new Error("Aucune ligne importable. Utilise les colonnes code_barres, nom, quantite ou stock_actuel.");
    }
    if (rows.length > 1000) {
      res.status(400);
      throw new Error("Import limite a 1000 lignes par fichier");
    }

    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      const barcode = String(getCell(row, ["code_barres", "barcode", "Code-barres", "Code barres"])).trim();
      const externalReference = String(getCell(row, ["reference_intrant", "Référence intrant", "Reference intrant"])).trim();
      const reference = barcode || externalReference;
      const name = String(getCell(row, ["nom", "name", "produit", "Produit", "libelle_intrant", "Libellé intrant", "Libelle intrant"])).trim();
      const quantityValue = getCell(row, ["quantite", "quantity", "Quantite"], "");
      const targetStockValue = getCell(row, [
        "stock_actuel",
        "stock",
        "Stock",
        "Stock à jour",
        "Stock a jour",
        "Somme des entrées achats",
        "Somme des entrees achats"
      ], "");
      if (!reference && !name) {
        skipped += 1;
        continue;
      }

      const purchasePriceValue = getCell(row, [
        "prix_achat",
        "purchasePrice",
        "Prix achat",
        "Valorisation stock intrants € (au coût d'achat)",
        "Valorisation stock intrants au cout d'achat"
      ], "");
      const targetStock = toNumber(targetStockValue, 0);
      const valuation = toNumber(purchasePriceValue, 0);
      const purchasePrice = targetStock > 0 && valuation > targetStock ? valuation / targetStock : valuation;

      let product = await Product.findOne(reference ? { barcode: reference } : { name });
      const salePrice = Math.max(0, toNumber(getCell(row, ["prix_vente", "salePrice", "Prix vente"], purchasePrice), purchasePrice));
      if (!product) {
        if (!name) {
          skipped += 1;
          continue;
        }
        product = await Product.create({
          name,
          category: String(getCell(row, ["categorie", "category", "Categorie"], "Epicerie")).trim() || "Epicerie",
          purchasePrice: Math.max(0, purchasePrice),
          salePrice,
          stock: 0,
          barcode: reference,
          lowStockAlert: toNumber(getCell(row, ["alerte_stock_faible", "lowStockAlert", "Alerte"], 5), 5)
        });
      } else {
        product.name = name || product.name;
        product.category = String(getCell(row, ["categorie", "category", "Categorie"], product.category)).trim() || product.category;
        product.purchasePrice = purchasePrice > 0 ? Math.max(0, purchasePrice) : product.purchasePrice;
        product.salePrice = product.salePrice > 0 ? product.salePrice : salePrice;
        product.lowStockAlert = toNumber(getCell(row, ["alerte_stock_faible", "lowStockAlert", "Alerte"], product.lowStockAlert), product.lowStockAlert);
      }

      const hasQuantity = quantityValue !== "";
      const quantity = hasQuantity ? toNumber(quantityValue, 0) : toNumber(targetStockValue, product.stock) - product.stock;
      if (!quantity) {
        skipped += 1;
        continue;
      }

      const type = hasQuantity ? normalizeMovementType(getCell(row, ["type", "Type"], "restock")) : "adjustment";
      product.stock += quantity;
      if (product.stock < 0) {
        product.stock = 0;
      }
      await product.save();

      await StockMovement.create({
        product: product._id,
        type,
        quantity,
        note: getCell(row, ["note", "Note"], "Import Excel stock"),
        createdBy: req.user._id
      });
      imported += 1;
    }

    res.json({ imported, skipped });
  })
);

router.post(
  "/restock",
  protect,
  asyncHandler(async (req, res) => {
    const { productId, quantity, note } = req.body;
    if (!mongoose.Types.ObjectId.isValid(productId) || Number(quantity) <= 0) {
      res.status(400);
      throw new Error("Produit ou quantite invalide");
    }
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      throw new Error("Produit introuvable");
    }
    product.stock += Number(quantity);
    await product.save();

    const movement = await StockMovement.create({
      product: product._id,
      type: "restock",
      quantity: Number(quantity),
      note: note || "Ajout manuel de stock",
      createdBy: req.user._id
    });

    res.status(201).json({ product, movement });
  })
);

module.exports = router;
