const mongoose = require("mongoose");

const validateObjectId = (paramName = "id") => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
    res.status(400);
    return next(new Error("Identifiant invalide"));
  }
  return next();
};

module.exports = validateObjectId;
