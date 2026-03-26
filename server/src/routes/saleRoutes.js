const express = require("express");
const asyncHandler = require("express-async-handler");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const createTicketNumber = () => `TCK-${Date.now()}`;

router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const sales = await Sale.find()
      .populate("customer", "name phone email")
      .populate("cashier", "name role")
      .sort({ createdAt: -1 });
    res.json(sales);
  })
);

router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const { items, paymentMethod, customer } = req.body;
    if (!items?.length) {
      res.status(400);
      throw new Error("Le panier est vide");
    }

    const saleItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        res.status(404);
        throw new Error("Produit introuvable");
      }
      if (product.stock < item.quantity) {
        res.status(400);
        throw new Error(`Stock insuffisant pour ${product.name}`);
      }

      product.stock -= item.quantity;
      await product.save();

      await StockMovement.create({
        product: product._id,
        type: "sale",
        quantity: -item.quantity,
        note: "Vente en caisse",
        createdBy: req.user._id
      });

      const total = product.salePrice * item.quantity;
      subtotal += total;

      saleItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        unitPrice: product.salePrice,
        total
      });
    }

    const sale = await Sale.create({
      customer: customer || null,
      items: saleItems,
      subtotal,
      total: subtotal,
      paymentMethod,
      cashier: req.user._id,
      ticketNumber: createTicketNumber()
    });

    const populated = await Sale.findById(sale._id)
      .populate("customer", "name phone email")
      .populate("cashier", "name role");

    res.status(201).json(populated);
  })
);

module.exports = router;
