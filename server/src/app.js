const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const customerRoutes = require("./routes/customerRoutes");
const saleRoutes = require("./routes/saleRoutes");
const stockRoutes = require("./routes/stockRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const cashRoutes = require("./routes/cashRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
if (process.env.NODE_ENV === "production" && !allowedOrigins.includes("https://appboutique-web.onrender.com")) {
  allowedOrigins.push("https://appboutique-web.onrender.com");
}

const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de requetes, reessayez dans quelques minutes." }
});

const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de tentatives de connexion, reessayez plus tard." }
});

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "https://accounts.google.com", "https://apis.google.com"],
        "frame-src": ["'self'", "https://accounts.google.com"],
        "connect-src": ["'self'", "https://accounts.google.com"],
        "img-src": ["'self'", "data:", "https:"]
      }
    },
    referrerPolicy: { policy: "no-referrer" }
  })
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || (process.env.NODE_ENV !== "production" && allowedOrigins.length === 0)) {
        return callback(null, true);
      }
      return callback(new Error("Origine non autorisee par CORS"));
    },
    credentials: false
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(mongoSanitize());
app.use(hpp());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: "credits-2026-07-29" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/cash", cashRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
