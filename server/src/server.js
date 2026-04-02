require("dotenv").config();
const connectDb = require("./config/db");
const app = require("./app");

const PORT = process.env.PORT || 5000;

connectDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Serveur lance sur le port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Impossible de demarrer le serveur:", error.message);
    process.exit(1);
  });
