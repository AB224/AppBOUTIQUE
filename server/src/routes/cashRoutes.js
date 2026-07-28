const express = require("express");
const asyncHandler = require("express-async-handler");
const CashMovement = require("../models/CashMovement");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/movements",
  protect,
  asyncHandler(async (req, res) => {
    const movements = await CashMovement.find()
      .populate("product", "name category barcode")
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 });
    res.json(movements);
  })
);

router.post(
  "/returns",
  protect,
  asyncHandler(async (req, res) => {
    const { productId, quantity, amount, paymentMethod, reason, note, restock } = req.body;
    const refundAmount = Number(amount);
    const refundQuantity = Number(quantity || 1);

    if (!refundAmount || refundAmount <= 0) {
      res.status(400);
      throw new Error("Le montant du decaissement est obligatoire");
    }

    if (!reason?.trim()) {
      res.status(400);
      throw new Error("Le motif du retour est obligatoire");
    }

    let product = null;
    if (productId) {
      product = await Product.findById(productId);
      if (!product) {
        res.status(404);
        throw new Error("Produit introuvable");
      }

      if (restock) {
        product.stock += refundQuantity;
        await product.save();

        await StockMovement.create({
          product: product._id,
          type: "return",
          quantity: refundQuantity,
          note: `Retour produit defectueux: ${reason}`,
          createdBy: req.user._id
        });
      }
    }

    const movement = await CashMovement.create({
      type: "return_refund",
      product: product?._id || null,
      productName: product?.name || "",
      quantity: refundQuantity,
      amount: refundAmount,
      paymentMethod: paymentMethod || "cash",
      reason,
      note: note || "",
      createdBy: req.user._id
    });

    res.status(201).json(await movement.populate("product", "name category barcode"));
  })
);

module.exports = router;
