const jwt = require("jsonwebtoken");
const User = require("../models/user");

/**
 * authMiddleware - vérifie le token JWT et attache `req.user`
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({ success: false, message: "Token manquant" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ success: false, message: "Token invalide" });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: "Utilisateur non trouvé" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("❌ [Backend] Auth middleware error:", error.message);
    return res.status(401).json({ success: false, message: "Authentification échouée" });
  }
};

module.exports = { authMiddleware };