import express from "express";
import { createService, getServices } from "../controllers/serviceController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
const router = express.Router();

// Public route to get services
router.get("/", getServices);

// Protected route to create a service (only for providers)
router.post("/", protect, upload.array("media", 5), createService);
export default router;
// This file defines the routes for service-related operations.
// It includes a public route to get services and a protected route to create a service, accessible only by authenticated providers.