const express = require("express");
const asyncHandler = require("express-async-handler");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const { protect } = require("../middleware/authMiddleware");
const mongoose = require("mongoose");

const router = express.Router();

const formatTicketDate = (date = new Date()) => {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

const createTicketNumber = async () => {
  const prefix = `TCK-${formatTicketDate()}-`;
  const lastSale = await Sale.findOne({ ticketNumber: { $regex: `^${prefix}` } }).sort({ ticketNumber: -1 });
  const lastSequence = Number(lastSale?.ticketNumber?.split("-").pop() || 0);
  return `${prefix}${String(lastSequence + 1).padStart(4, "0")}`;
};

const createSaleWithTicket = async (payload) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await Sale.create({ ...payload, ticketNumber: await createTicketNumber() });
    } catch (error) {
      if (error?.code !== 11000 || attempt === 2) {
        throw error;
      }
    }
  }
};

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
    if (items.length > 100) {
      res.status(400);
      throw new Error("Panier trop volumineux");
    }
    if (customer && !mongoose.Types.ObjectId.isValid(customer)) {
      res.status(400);
      throw new Error("Client invalide");
    }

    const saleItems = [];
    let subtotal = 0;

    for (const item of items) {
      if (!mongoose.Types.ObjectId.isValid(item.product) || Number(item.quantity) <= 0) {
        res.status(400);
        throw new Error("Ligne de panier invalide");
      }
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

    const sale = await createSaleWithTicket({
      customer: customer || null,
      items: saleItems,
      subtotal,
      total: subtotal,
      paymentMethod,
      cashier: req.user._id
    });

    const populated = await Sale.findById(sale._id)
      .populate("customer", "name phone email")
      .populate("cashier", "name role");

    res.status(201).json(populated);
  })
);

module.exports = router;
