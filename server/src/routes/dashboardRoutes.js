const express = require("express");
const asyncHandler = require("express-async-handler");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const CashMovement = require("../models/CashMovement");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const sumSales = (sales) => sales.reduce((sum, sale) => sum + sale.total, 0);
const sumMovements = (movements) => movements.reduce((sum, movement) => sum + movement.amount, 0);

router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const startOfMonth = new Date(now);
    startOfMonth.setMonth(now.getMonth() - 1);

    const [
      daySales,
      weekSales,
      monthSales,
      sales,
      products,
      dayRefunds,
      weekRefunds,
      monthRefunds,
      recentRefunds
    ] = await Promise.all([
      Sale.find({ createdAt: { $gte: startOfDay } }),
      Sale.find({ createdAt: { $gte: startOfWeek } }),
      Sale.find({ createdAt: { $gte: startOfMonth } }),
      Sale.find(),
      Product.find(),
      CashMovement.find({ type: "return_refund", createdAt: { $gte: startOfDay } }),
      CashMovement.find({ type: "return_refund", createdAt: { $gte: startOfWeek } }),
      CashMovement.find({ type: "return_refund", createdAt: { $gte: startOfMonth } }),
      CashMovement.find({ type: "return_refund" })
        .populate("product", "name category barcode")
        .sort({ createdAt: -1 })
        .limit(8)
    ]);

    const topProductsMap = {};
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!topProductsMap[item.name]) {
          topProductsMap[item.name] = 0;
        }
        topProductsMap[item.name] += item.quantity;
      });
    });

    const topProducts = Object.entries(topProductsMap)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const grossRevenue = {
      day: sumSales(daySales),
      week: sumSales(weekSales),
      month: sumSales(monthSales)
    };
    const refunds = {
      day: sumMovements(dayRefunds),
      week: sumMovements(weekRefunds),
      month: sumMovements(monthRefunds)
    };
    const netRevenue = {
      day: grossRevenue.day - refunds.day,
      week: grossRevenue.week - refunds.week,
      month: grossRevenue.month - refunds.month
    };

    res.json({
      revenue: netRevenue,
      grossRevenue,
      refunds,
      netRevenue,
      stats: {
        salesCount: sales.length,
        productsCount: products.length,
        lowStockCount: products.filter((product) => product.stock <= product.lowStockAlert).length,
        refundCount: monthRefunds.length
      },
      topProducts,
      refundedProducts: recentRefunds.map((movement) => ({
        _id: movement._id,
        createdAt: movement.createdAt,
        productName: movement.product?.name || movement.productName || "Produit non reference",
        productReference: movement.productReference || movement.product?.barcode || "",
        quantity: movement.quantity,
        amount: movement.amount,
        reason: movement.reason,
        paymentMethod: movement.paymentMethod
      }))
    });
  })
);

module.exports = router;
