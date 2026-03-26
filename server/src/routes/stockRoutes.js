const express = require("express");
const asyncHandler = require("express-async-handler");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

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

router.post(
  "/restock",
  protect,
  asyncHandler(async (req, res) => {
    const { productId, quantity, note } = req.body;
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
