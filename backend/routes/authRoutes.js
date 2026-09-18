const express = require("express");
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const authorizeRoles = require("../middleware/roleMiddleware");
const { resendVerificationRateLimit } = require("../middleware/rateLimit");

const router = express.Router();

const {
    registerUser,
    verifyEmail,
    resendVerificationEmail,
    forgotPassword,
    resetPassword,
    loginUser,
    refreshAccessToken,
    logoutUser,
    googleLogin,
    googleCallback
} = require("../controllers/authController");


router.post("/resend-verification", resendVerificationRateLimit, resendVerificationEmail);
router.post("/register", registerUser);
router.get("/verify-email", verifyEmail);
router.post("/login", loginUser);
router.get("/google", googleLogin);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);
router.post("/reset-password", resetPassword);
router.post("/forgot-password", forgotPassword);


router.get("/google/callback", googleCallback);
router.get(
    "/admin",
    protect,
    authorizeRoles("admin"),
    (req, res) => {
        res.status(200).json({
            message: "Welcome Admin",
            user: req.user
        });
    }
);

router.get(
    "/staff",
    protect,
    authorizeRoles("admin", "moderator"),
    (req, res) => {
        res.status(200).json({
            message: "Welcome Staff",
            user: req.user
        });
    }
);

router.get("/profile", protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "Profile fetched successfully",
            user
        });
    } catch (error) {
        res.status(500).json({
            message: "Server error"
        });
    }
});

module.exports = router;
