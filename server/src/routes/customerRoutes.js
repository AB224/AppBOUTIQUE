const express = require("express");
const asyncHandler = require("express-async-handler");
const Customer = require("../models/Customer");
const Sale = require("../models/Sale");
const CustomerCredit = require("../models/CustomerCredit");
const { protect } = require("../middleware/authMiddleware");
const validateObjectId = require("../middleware/validateObjectId");

const router = express.Router();
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const getNextReminderDate = (date = new Date()) => new Date(new Date(date).getTime() + WEEK_MS);

const serializeCredit = (credit) => {
  const remainingAmount = Math.max(Number(credit.amount) - Number(credit.paidAmount || 0), 0);
  return {
    ...credit.toObject(),
    remainingAmount,
    reminderDue: credit.status !== "paid" && credit.nextReminderAt && credit.nextReminderAt.getTime() <= Date.now()
  };
};

router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const customers = await Customer.find().sort({ createdAt: -1 });
    const credits = await CustomerCredit.aggregate([
      { $match: { status: { $ne: "paid" } } },
      {
        $group: {
          _id: "$customer",
          totalAmount: { $sum: "$amount" },
          paidAmount: { $sum: "$paidAmount" },
          dueCount: { $sum: { $cond: [{ $lte: ["$nextReminderAt", new Date()] }, 1, 0] } },
          nextReminderAt: { $min: "$nextReminderAt" }
        }
      }
    ]);
    const summaryByCustomer = new Map(credits.map((item) => [String(item._id), item]));
    res.json(
      customers.map((customer) => {
        const summary = summaryByCustomer.get(String(customer._id));
        return {
          ...customer.toObject(),
          creditSummary: {
            remainingAmount: summary ? Math.max(summary.totalAmount - summary.paidAmount, 0) : 0,
            dueCount: summary?.dueCount || 0,
            nextReminderAt: summary?.nextReminderAt || null
          }
        };
      })
    );
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
  validateObjectId(),
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
  validateObjectId(),
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
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const sales = await Sale.find({ customer: req.params.id }).sort({ createdAt: -1 });
    res.json(sales);
  })
);

router.get(
  "/:id/credits",
  protect,
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const credits = await CustomerCredit.find({ customer: req.params.id }).sort({ createdAt: -1 });
    res.json(credits.map(serializeCredit));
  })
);

router.post(
  "/:id/credits",
  protect,
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      res.status(404);
      throw new Error("Client introuvable");
    }

    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) {
      res.status(400);
      throw new Error("Montant de creance invalide");
    }

    const credit = await CustomerCredit.create({
      customer: customer._id,
      reference: req.body.reference || "",
      description: req.body.description || "Achat non paye",
      amount,
      nextReminderAt: getNextReminderDate(),
      createdBy: req.user._id
    });

    res.status(201).json(serializeCredit(credit));
  })
);

router.patch(
  "/credits/:creditId",
  protect,
  validateObjectId("creditId"),
  asyncHandler(async (req, res) => {
    const credit = await CustomerCredit.findById(req.params.creditId);
    if (!credit) {
      res.status(404);
      throw new Error("Creance introuvable");
    }

    if (req.body.action === "reminder") {
      credit.lastReminderAt = new Date();
      credit.nextReminderAt = getNextReminderDate();
    }

    if (req.body.action === "payment") {
      const paidAmount = Number(req.body.paidAmount);
      if (!paidAmount || paidAmount <= 0) {
        res.status(400);
        throw new Error("Montant paye invalide");
      }
      credit.paidAmount = Math.min(Number(credit.paidAmount || 0) + paidAmount, Number(credit.amount));
      credit.status = credit.paidAmount >= credit.amount ? "paid" : "partial";
      credit.paidAt = credit.status === "paid" ? new Date() : null;
      credit.nextReminderAt = credit.status === "paid" ? null : getNextReminderDate();
    }

    await credit.save();
    res.json(serializeCredit(credit));
  })
);

router.delete(
  "/credits/:creditId",
  protect,
  validateObjectId("creditId"),
  asyncHandler(async (req, res) => {
    const credit = await CustomerCredit.findById(req.params.creditId);
    if (!credit) {
      res.status(404);
      throw new Error("Creance introuvable");
    }
    await credit.deleteOne();
    res.json({ message: "Creance supprimee" });
  })
);

module.exports = router;
