const jwt = require("jsonwebtoken");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    issuer: process.env.JWT_ISSUER || "appboutique-api",
    audience: process.env.JWT_AUDIENCE || "appboutique-web",
    expiresIn: "7d"
  });

module.exports = generateToken;
