const User = require("../models/User");

const ensureAdmin = async () => {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn("Compte administrateur non initialise : ADMIN_EMAIL ou ADMIN_PASSWORD manquant.");
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    let changed = false;
    if (existing.role !== "admin") {
      existing.role = "admin";
      changed = true;
    }
    if (!existing.localPasswordProvisioned) {
      existing.password = password;
      existing.localPasswordProvisioned = true;
      changed = true;
    }
    if (changed) {
      await existing.save();
    }
    return;
  }

  await User.create({
    name: process.env.ADMIN_NAME || "Administrateur",
    email,
    password,
    role: "admin",
    authProvider: "local",
    localPasswordProvisioned: true
  });
  console.log(`Compte administrateur initialise : ${email}`);
};

module.exports = ensureAdmin;
