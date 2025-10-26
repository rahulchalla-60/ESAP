import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  participants: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
      role: {
        type: String,
        enum: ["user", "provider"],
        required: true
      },
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true
  },
  lastMessage: {
    content: {
      type: String,
      default: ""
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text"
    }
  },
  unreadCounts: {
    type: Map,
    of: Number,
    default: new Map()
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for better query performance
conversationSchema.index({ "participants.userId": 1 });
conversationSchema.index({ serviceId: 1 });
conversationSchema.index({ updatedAt: -1 });
conversationSchema.index({ "participants.userId": 1, serviceId: 1 }, { unique: true });

// Update the updatedAt field before saving
conversationSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Method to add participant to conversation
conversationSchema.methods.addParticipant = function (userId, role) {
  const existingParticipant = this.participants.find(
    p => p.userId.toString() === userId.toString()
  );
  
  if (!existingParticipant) {
    this.participants.push({
      userId,
      role,
      joinedAt: new Date()
    });
    
    // Initialize unread count for new participant
    this.unreadCounts.set(userId.toString(), 0);
  }
  
  return this;
};

// Method to update last message
conversationSchema.methods.updateLastMessage = function (content, senderId, messageType = "text") {
  this.lastMessage = {
    content,
    senderId,
    timestamp: new Date(),
    messageType
  };
  
  // Increment unread count for all participants except sender
  this.participants.forEach(participant => {
    const participantId = participant.userId.toString();
    if (participantId !== senderId.toString()) {
      const currentCount = this.unreadCounts.get(participantId) || 0;
      this.unreadCounts.set(participantId, currentCount + 1);
    }
  });
  
  this.updatedAt = new Date();
  return this;
};

// Method to mark messages as read for a user
conversationSchema.methods.markAsRead = function (userId) {
  this.unreadCounts.set(userId.toString(), 0);
  return this;
};

// Method to get unread count for a user
conversationSchema.methods.getUnreadCount = function (userId) {
  return this.unreadCounts.get(userId.toString()) || 0;
};

// Method to check if user is participant
conversationSchema.methods.isParticipant = function (userId) {
  return this.participants.some(
    p => p.userId.toString() === userId.toString()
  );
};

// Static method to find conversation between user and provider for a service
conversationSchema.statics.findByUserAndService = function (userId, serviceId) {
  return this.findOne({
    "participants.userId": userId,
    serviceId: serviceId,
    isActive: true
  }).populate("participants.userId", "name contact role photo")
    .populate("serviceId", "serviceName provider")
    .populate("lastMessage.senderId", "name");
};

// Static method to get user's conversations
conversationSchema.statics.getUserConversations = function (userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({
    "participants.userId": userId,
    isActive: true
  })
    .populate("participants.userId", "name contact role photo")
    .populate("serviceId", "serviceName provider")
    .populate("lastMessage.senderId", "name")
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);
};

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;