const mongoose = require("mongoose");

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connecte");
  } catch (error) {
    console.error("Erreur MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectDb;
