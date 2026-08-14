require("dotenv").config();
const connectDb = require("../config/db");
const User = require("../models/User");

const seedAdmin = async () => {
  await connectDb();
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL et ADMIN_PASSWORD sont obligatoires pour creer un administrateur.");
  }
  const existing = await User.findOne({ email });

  if (existing) {
    console.log("Admin deja present:", email);
    process.exit(0);
  }

  const user = await User.create({
    name: process.env.ADMIN_NAME || "Administrateur",
    email,
    password,
    role: "admin"
  });

  console.log("Admin cree:", user.email);
  process.exit(0);
};

seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
