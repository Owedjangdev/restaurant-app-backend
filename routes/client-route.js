const express = require("express");
const {
  getClientProfile,
  updateClientProfile,
} = require("../controller/client-controller");
const { authMiddleware } = require("../middleware/auth-middleware");

const router = express.Router();

// ============================================================
// PROTECTED ROUTES (Require Authentication)
// ============================================================

/**
 * @route GET /profile
 * @description Get client profile
 * @header {string} Authorization - Bearer token (required)
 * @returns {object} 200 - Client profile object
 * @returns {object} 401 - Unauthorized (invalid/missing token)
 * @returns {object} 404 - Profile not found
 */
router.get("/profile", authMiddleware, getClientProfile);

/**
 * @route PUT /profile
 * @description Update client profile information
 * @header {string} Authorization - Bearer token (required)
 * @body {string} [fullName] - Updated full name
 * @body {string} [phone] - Updated phone number
 * @body {string} [address] - Updated address
 * @body {string} [city] - Updated city
 * @body {string} [postalCode] - Updated postal code
 * @returns {object} 200 - Profile updated successfully
 * @returns {object} 400 - Validation error
 * @returns {object} 401 - Unauthorized
 */
router.put("/profile", authMiddleware, updateClientProfile);

module.exports = router;
