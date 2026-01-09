const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendResetPasswordEmail, sendDeliveryWelcomeEmail, sendOrderConfirmationEmail } = require("../services/emailService");

/**
 * REGISTER - Client only
 */
const register = async (req, res) => {
  try {
    console.log("📥 [Backend] Données reçues pour register:", req.body);

    const { fullName, phone, email, address, password } = req.body;

    if (!fullName || !phone || !email || !address || !password) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs requis doivent être remplis",
      });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email ou numéro de téléphone déjà utilisé",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      phone,
      email,
      address,
      password: hashedPassword,
      role: "client",
    });

    console.log("✅ [Backend] Utilisateur créé:", user._id);

    res.status(201).json({
      success: true,
      message: "Compte créé avec succès",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur register:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * LOGIN
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email et mot de passe requis",
      });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Identifiants invalides",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Compte désactivé",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Identifiants invalides",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        fullName: user.fullName,
        role: user.role,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    console.log("✅ [Backend] Login réussi pour:", user.email);

    res.status(200).json({
      success: true,
      message: "Connexion réussie",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur login:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * CHANGE PASSWORD - Route protégée
 */
const changePassword = async (req, res) => {
  try {
    // Vérifier que l'utilisateur est bien authentifié
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise",
      });
    }

    console.log("📥 Body reçu:", req.body);
    console.log("📥 Clés du body:", Object.keys(req.body));

    const { currentPassword, newPassword } = req.body;
    console.log("currentPassword:", currentPassword);
    console.log("newPassword:", newPassword);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Ancien et nouveau mot de passe requis",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Le nouveau mot de passe doit contenir au moins 8 caractères",
      });
    }

    // Récupère l'utilisateur avec son mot de passe
    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    // Vérifie l'ancien mot de passe
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Mot de passe actuel incorrect",
      });
    }

    // Vérifie que le nouveau mot de passe est différent de l'ancien
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "Le nouveau mot de passe doit être différent de l'ancien",
      });
    }

    // Hachage et sauvegarde du nouveau
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    console.log("✅ [Backend] Mot de passe changé pour:", user.email);

    res.status(200).json({
      success: true,
      message: "Mot de passe modifié avec succès",
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur change password:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * FORGOT PASSWORD - Réinitialiser le mot de passe via email
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email requis",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Pour la sécurité, on renvoie un message générique même si l'email n'existe pas
      return res.status(200).json({
        success: true,
        message: "Si cet email existe, un lien de réinitialisation sera envoyé.",
      });
    }

    // Générer un token sécurisé et stocker dans la base de données
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    // Envoyer l'email avec le token
    const emailSent = await sendResetPasswordEmail(email, resetToken, user);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Erreur lors de l'envoi du email",
      });
    }

    console.log("✅ [Backend] Email de réinitialisation envoyé à:", user.email);

    res.status(200).json({
      success: true,
      message: "Un lien de réinitialisation a été envoyé à votre email",
    });

  } catch (error) {
    console.error("❌ [Backend] Erreur forgot password:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * RESET PASSWORD - Réinitialiser le mot de passe avec token
 */
const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token et nouveau mot de passe requis",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Le nouveau mot de passe doit contenir au moins 8 caractères",
      });
    }

    // Hasher le token reçu pour le comparer avec celui en base de données
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpiry: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpiry');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token invalide ou expiré",
      });
    }

    // Mettre à jour le mot de passe
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    console.log("✅ [Backend] Mot de passe réinitialisé pour:", user.email);

    res.status(200).json({
      success: true,
      message: "Mot de passe réinitialisé avec succès",
    });

  } catch (error) {
    console.error("❌ [Backend] Erreur reset password:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

module.exports = { register, login, changePassword, forgotPassword, resetPassword };