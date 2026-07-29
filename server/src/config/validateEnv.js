const REQUIRED_PRODUCTION_ENV = ["MONGO_URI", "JWT_SECRET", "CLIENT_URL"];

const validateEnv = () => {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const missing = REQUIRED_PRODUCTION_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Variables d'environnement manquantes: ${missing.join(", ")}`);
  }

  if (process.env.JWT_SECRET.length < 32 || /change_this|devjsfullstack|secret/i.test(process.env.JWT_SECRET)) {
    throw new Error("JWT_SECRET doit etre une valeur aleatoire forte d'au moins 32 caracteres");
  }

  if (!process.env.CLIENT_URL.startsWith("https://")) {
    throw new Error("CLIENT_URL doit utiliser HTTPS en production");
  }
};

module.exports = validateEnv;
