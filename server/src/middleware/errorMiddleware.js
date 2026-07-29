const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route introuvable: ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  const production = process.env.NODE_ENV === "production";
  const message = production && statusCode === 500 ? "Erreur serveur" : err.message;
  res.status(statusCode).json({
    message,
    stack: production ? undefined : err.stack
  });
};

module.exports = { notFound, errorHandler };
