import express from "express";
import {
  createOrGetConversation,
  getUserConversations,
  getConversation,
  getConversationMessages,
  sendMessage,
  markMessagesAsRead,
  getConversationStats,
  deleteConversation
} from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All chat routes require authentication
router.use(protect);

// Conversation routes
router.post("/conversations", createOrGetConversation);
router.get("/conversations", getUserConversations);
router.get("/conversations/:conversationId", getConversation);
router.delete("/conversations/:conversationId", deleteConversation);

// Message routes
router.get("/conversations/:conversationId/messages", getConversationMessages);
router.post("/conversations/:conversationId/messages", sendMessage);
router.put("/conversations/:conversationId/read", markMessagesAsRead);

// Statistics routes
router.get("/conversations/:conversationId/stats", getConversationStats);

export default router;