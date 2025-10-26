import express from "express";
import { createService, getServices, updateService, deleteService } from "../controllers/serviceController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateServiceCreation, validateServiceUpdate } from "../middleware/validationMiddleware.js";

const router = express.Router();

// Public route to get services
router.get("/", getServices);

// Protected routes for service management (only for providers)
router.post("/", protect, validateServiceCreation, createService);
router.put("/:id", protect, validateServiceUpdate, updateService);
router.delete("/:id", protect, deleteService);

export default router;
// This file defines the routes for service-related operations.
// It includes a public route to get services and protected routes to create, update, and delete services, accessible only by authenticated providers.