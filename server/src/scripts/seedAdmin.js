require("dotenv").config();
const connectDb = require("../config/db");
const User = require("../models/User");

const seedAdmin = async () => {
  await connectDb();
  const email = process.env.ADMIN_EMAIL || "devjsfullstrack@gmail.com";
  const existing = await User.findOne({ email });

  if (existing) {
    console.log("Admin deja present:", email);
    process.exit(0);
  }

  const user = await User.create({
    name: process.env.ADMIN_NAME || "Administrateur",
    email,
    password: process.env.ADMIN_PASSWORD || "Admin123!",
    role: "admin"
  });

  console.log("Admin cree:", user.email);
  process.exit(0);
};

seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
