const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["admin", "employee"], default: "employee" },
    authProvider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String, trim: true, default: "" },
    totpEnabled: { type: Boolean, default: false },
    totpSecret: { type: String, select: false, default: "" },
    totpVerifiedAt: { type: Date, default: null },
    loginOtpHash: { type: String, select: false, default: "" },
    loginOtpExpiresAt: { type: Date, select: false, default: null },
    loginOtpRequestId: { type: String, select: false, default: "" }
  },
  { timestamps: true }
);

userSchema.pre("save", async function save(next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function matchPassword(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
