const express = require("express");
const asyncHandler = require("express-async-handler");
const Customer = require("../models/Customer");
const Sale = require("../models/Sale");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  })
);

router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  })
);

router.put(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!customer) {
      res.status(404);
      throw new Error("Client introuvable");
    }
    res.json(customer);
  })
);

router.delete(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      res.status(404);
      throw new Error("Client introuvable");
    }
    await customer.deleteOne();
    res.json({ message: "Client supprime" });
  })
);

router.get(
  "/:id/history",
  protect,
  asyncHandler(async (req, res) => {
    const sales = await Sale.find({ customer: req.params.id }).sort({ createdAt: -1 });
    res.json(sales);
  })
);

module.exports = router;
