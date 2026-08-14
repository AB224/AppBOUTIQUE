require("dotenv").config();
const validateEnv = require("./config/validateEnv");
const connectDb = require("./config/db");
const app = require("./app");
const ensureAdmin = require("./utils/ensureAdmin");

const PORT = process.env.PORT || 5000;

validateEnv();

connectDb()
  .then(async () => {
    await ensureAdmin();
    app.listen(PORT, () => {
      console.log(`Serveur lance sur le port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Impossible de demarrer le serveur:", error.message);
    process.exit(1);
  });
