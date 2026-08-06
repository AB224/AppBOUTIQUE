const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Product = require("../models/Product");

dotenv.config();

const formatProductReference = (number) => `H${String(number).padStart(5, "0")}`;

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI est manquant dans l'environnement");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const products = await Product.find().sort({ createdAt: 1, _id: 1 });
  let index = 1;

  for (const product of products) {
    product.barcode = formatProductReference(index);
    await product.save();
    index += 1;
  }

  console.log(`${products.length} reference(s) produit mises a jour.`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
