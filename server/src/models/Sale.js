const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    items: { type: [saleItemSchema], required: true },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["cash", "card"], required: true },
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ticketNumber: { type: String, required: true, unique: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sale", saleSchema);
