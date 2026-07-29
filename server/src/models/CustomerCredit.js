const mongoose = require("mongoose");

const customerCreditSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    reference: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, required: true },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["unpaid", "partial", "paid"], default: "unpaid" },
    lastReminderAt: { type: Date, default: null },
    nextReminderAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    paidAt: { type: Date, default: null }
  },
  { timestamps: true }
);

customerCreditSchema.virtual("remainingAmount").get(function remainingAmount() {
  return Math.max(this.amount - this.paidAmount, 0);
});

module.exports = mongoose.model("CustomerCredit", customerCreditSchema);
