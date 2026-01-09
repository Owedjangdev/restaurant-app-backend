const User = require("../models/user");
const bcrypt = require("bcryptjs");

/**
 * GET /api/client/profile
 * @description Get client profile
 * @header {string} Authorization - Bearer token (required)
 */
const getClientProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    res.status(200).json({
      success: true,
      profile: user,
    });
  } catch (error) {
    console.error("❌ [Client Profile] Error:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * PUT /api/client/profile
 * @description Update client profile
 * @header {string} Authorization - Bearer token (required)
 * @body {string} [fullName] - Updated full name
 * @body {string} [phone] - Updated phone number
 * @body {string} [address] - Updated address
 * @body {string} [city] - Updated city
 * @body {string} [postalCode] - Updated postal code
 */
const updateClientProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { fullName, phone, address, city, postalCode } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const updateData = {};

    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (city) updateData.city = city;
    if (postalCode) updateData.postalCode = postalCode;

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.status(200).json({
      success: true,
      message: "Profil mis à jour avec succès",
      profile: user,
    });
  } catch (error) {
    console.error("❌ [Update Client Profile] Error:", error);
    res.status(400).json({
      success: false,
      message: "Erreur lors de la mise à jour",
      error: error.message,
    });
  }
};

module.exports = {
  getClientProfile,
  updateClientProfile,
};
