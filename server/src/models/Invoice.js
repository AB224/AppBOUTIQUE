const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    items: { type: [invoiceItemSchema], required: true },
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: { type: String, enum: ["draft", "sent", "paid"], default: "draft" },
    dueDate: { type: Date },
    senderEmail: { type: String, default: process.env.DEFAULT_SENDER_EMAIL || "baha3116@gmail.com" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
