const mongoose = require("mongoose");

const cashMovementSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["return_refund", "cash_out"], required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    productName: { type: String, trim: true, default: "" },
    productReference: { type: String, trim: true, default: "" },
    quantity: { type: Number, min: 1, default: 1 },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ["cash", "card"], default: "cash" },
    reason: { type: String, trim: true, required: true },
    note: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("CashMovement", cashMovementSchema);
