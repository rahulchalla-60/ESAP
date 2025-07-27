import express from "express";
import { registerUser, loginUser } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", (req, res) => {
  // If using cookies: res.clearCookie('token');
  res.json({ message: "Logged out successfully. Please remove the token on the client." });
});
// ✅ Protected route: Get user profile (with photo as base64)
router.get("/profile", protect, (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    contact: req.user.contact,
    role: req.user.role,
    photo: req.user.photo && req.user.photo.data
      ? {
          data: req.user.photo.data.toString("base64"),
          contentType: req.user.photo.contentType,
        }
      : null,
  });
});

export default router;
