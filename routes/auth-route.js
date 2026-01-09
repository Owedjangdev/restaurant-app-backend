const express = require("express");
const { register, login, changePassword, forgotPassword, resetPassword } = require("../controller/auth-controller");
const { authMiddleware } = require("../middleware/auth-middleware");

const router = express.Router();

// PUBLIC ROUTES
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);



router.post('/change-password', authMiddleware, changePassword);
;// PROTECTED ROUTES
router.get("/me", authMiddleware, (req, res) => {
  res.status(200).json({
    id: req.user._id,
    fullName: req.user.fullName,
    email: req.user.email,
    phone: req.user.phone,
    role: req.user.role,
  });
});

module.exports= router;