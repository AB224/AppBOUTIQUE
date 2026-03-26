const express = require("express");
const asyncHandler = require("express-async-handler");
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const query = req.query.q
      ? {
          $or: [
            { name: { $regex: req.query.q, $options: "i" } },
            { category: { $regex: req.query.q, $options: "i" } },
            { barcode: { $regex: req.query.q, $options: "i" } }
          ]
        }
      : {};
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
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
