import express from "express";
import { registerUser, loginUser } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// ✅ Protected route: Get user profile
router.get("/profile", protect, (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    contact: req.user.contact,
    role: req.user.role,
  });
});

// ✅ Protected route: Get user photo
router.get("/profile/photo", protect, (req, res) => {
  if (req.user.photo && req.user.photo.data) {
    res.set("Content-Type", req.user.photo.contentType);
    res.send(req.user.photo.data);
  } else {
    res.status(404).json({ message: "No photo found for this user" });
  }
});

export default router;
