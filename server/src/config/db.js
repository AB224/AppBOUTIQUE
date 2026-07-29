const mongoose = require("mongoose");

const connectDb = async () => {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/appboutique";

  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10
    });
    console.log("MongoDB connecte");
  } catch (error) {
    console.error("Erreur MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectDb;
