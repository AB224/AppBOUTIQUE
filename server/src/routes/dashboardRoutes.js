const express = require("express");
const asyncHandler = require("express-async-handler");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const sumSales = (sales) => sales.reduce((sum, sale) => sum + sale.total, 0);

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

    const [daySales, weekSales, monthSales, sales, products] = await Promise.all([
      Sale.find({ createdAt: { $gte: startOfDay } }),
      Sale.find({ createdAt: { $gte: startOfWeek } }),
      Sale.find({ createdAt: { $gte: startOfMonth } }),
      Sale.find(),
      Product.find()
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

    res.json({
      revenue: {
        day: sumSales(daySales),
        week: sumSales(weekSales),
        month: sumSales(monthSales)
      },
      stats: {
        salesCount: sales.length,
        productsCount: products.length,
        lowStockCount: products.filter((product) => product.stock <= product.lowStockAlert).length
      },
      topProducts
    });
  })
);

module.exports = router;
