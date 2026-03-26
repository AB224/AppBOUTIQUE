const crypto = require("crypto");
const express = require("express");
const asyncHandler = require("express-async-handler");
const { OAuth2Client } = require("google-auth-library");
const { authenticator } = require("otplib");
const QRCode = require("qrcode");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { sendLoginCodeEmail } = require("../utils/mailer");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

authenticator.options = { window: 1 };

const serializeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  authProvider: user.authProvider,
  totpEnabled: Boolean(user.totpEnabled)
});

const hashValue = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const randomPassword = () => crypto.randomBytes(24).toString("hex");
const createOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));
const createRequestId = () => crypto.randomBytes(24).toString("hex");

const verifyGoogleCredential = async (credential) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID manquant dans la configuration serveur");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) {
    throw new Error("Compte Google non verifie");
  }

  return payload;
};

const issueLoginOtp = async (user) => {
  const code = createOtpCode();
  const requestId = createRequestId();

  user.loginOtpHash = hashValue(code);
  user.loginOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  user.loginOtpRequestId = requestId;
  await user.save();

  await sendLoginCodeEmail({ to: user.email, code });

  return { requestId, email: user.email };
};

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password, totpCode } = req.body;
    const user = await User.findOne({ email }).select("+totpSecret");
    if (!user || !(await user.matchPassword(password))) {
      res.status(401);
      throw new Error("Email ou mot de passe invalide");
    }

    if (user.totpEnabled) {
      if (!totpCode || !authenticator.check(String(totpCode).replace(/\s+/g, ""), user.totpSecret)) {
        res.status(401);
        throw new Error("Code TOTP requis ou invalide");
      }
    }

    res.json({ token: generateToken(user._id), user: serializeUser(user) });
  })
);

router.post(
  "/google/request-code",
  asyncHandler(async (req, res) => {
    const { credential } = req.body;
    if (!credential) {
      res.status(400);
      throw new Error("Jeton Google manquant");
    }

    const payload = await verifyGoogleCredential(credential);
    const email = String(payload.email).toLowerCase();
    let user = await User.findOne({ $or: [{ email }, { googleId: payload.sub }] }).select(
      "+loginOtpHash +loginOtpExpiresAt +loginOtpRequestId"
    );

    if (!user) {
      user = await User.create({
        name: payload.name || email,
        email,
        password: randomPassword(),
        role: email === String(process.env.ADMIN_EMAIL || "").toLowerCase() ? "admin" : "employee",
        authProvider: "google",
        googleId: payload.sub
      });
    } else {
      user.name = payload.name || user.name;
      user.googleId = payload.sub;
      user.authProvider = "google";
      await user.save();
    }

    const otpSession = await issueLoginOtp(user);
    res.json({
      message: `Un code de connexion a ete envoye a ${otpSession.email}`,
      requestId: otpSession.requestId,
      email: otpSession.email
    });
  })
);

router.post(
  "/google/verify-code",
  asyncHandler(async (req, res) => {
    const { requestId, code } = req.body;
    if (!requestId || !code) {
      res.status(400);
      throw new Error("Code email ou requete manquant");
    }

    const user = await User.findOne({ loginOtpRequestId: requestId }).select(
      "+loginOtpHash +loginOtpExpiresAt +loginOtpRequestId"
    );
    if (!user) {
      res.status(400);
      throw new Error("Session de connexion invalide");
    }

    if (!user.loginOtpExpiresAt || user.loginOtpExpiresAt.getTime() < Date.now()) {
      res.status(400);
      throw new Error("Le code email a expire");
    }

    if (user.loginOtpHash !== hashValue(String(code).trim())) {
      res.status(400);
      throw new Error("Code email invalide");
    }

    user.loginOtpHash = "";
    user.loginOtpExpiresAt = null;
    user.loginOtpRequestId = "";
    await user.save();

    res.json({ token: generateToken(user._id), user: serializeUser(user) });
  })
);

router.get(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    res.json(serializeUser(req.user));
  })
);

router.get(
  "/totp/setup",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("+totpSecret");
    const secret = authenticator.generateSecret();
    const appName = process.env.TOTP_APP_NAME || "AppBoutique";
    const otpauthUrl = authenticator.keyuri(user.email, appName, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    user.totpSecret = secret;
    user.totpEnabled = false;
    user.totpVerifiedAt = null;
    await user.save();

    res.json({ secret, otpauthUrl, qrCodeDataUrl });
  })
);

router.post(
  "/totp/verify",
  protect,
  asyncHandler(async (req, res) => {
    const { totpCode } = req.body;
    const user = await User.findById(req.user._id).select("+totpSecret");
    if (!user?.totpSecret) {
      res.status(400);
      throw new Error("Configuration TOTP absente. Lancez d'abord l'activation.");
    }

    const isValid = authenticator.check(String(totpCode || "").replace(/\s+/g, ""), user.totpSecret);
    if (!isValid) {
      res.status(400);
      throw new Error("Code TOTP invalide");
    }

    user.totpEnabled = true;
    user.totpVerifiedAt = new Date();
    await user.save();

    res.json({ message: "TOTP active", user: serializeUser(user) });
  })
);

router.post(
  "/totp/disable",
  protect,
  asyncHandler(async (req, res) => {
    const { password, totpCode } = req.body;
    const user = await User.findById(req.user._id).select("+totpSecret +password");

    if (user.authProvider === "local") {
      if (!(await user.matchPassword(password))) {
        res.status(401);
        throw new Error("Mot de passe invalide");
      }
    }

    if (user.totpEnabled) {
      const isValid = authenticator.check(String(totpCode || "").replace(/\s+/g, ""), user.totpSecret);
      if (!isValid) {
        res.status(400);
        throw new Error("Code TOTP invalide");
      }
    }

    user.totpEnabled = false;
    user.totpSecret = "";
    user.totpVerifiedAt = null;
    await user.save();

    res.json({ message: "TOTP desactive", user: serializeUser(user) });
  })
);

router.post(
  "/users",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const existing = await User.findOne({ email: req.body.email });
    if (existing) {
      res.status(400);
      throw new Error("Cet email existe deja");
    }
    const user = await User.create(req.body);
    res.status(201).json(serializeUser(user));
  })
);

router.get(
  "/users",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users.map(serializeUser));
  })
);

module.exports = router;
