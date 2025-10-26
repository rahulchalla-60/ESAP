import mongoose from "mongoose";

const userSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  socketId: {
    type: String,
    default: null
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  activeConversations: [
    {
      conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation"
      },
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  deviceInfo: {
    userAgent: String,
    platform: String,
    browser: String
  },
  ipAddress: String,
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
userSessionSchema.index({ userId: 1 }, { unique: true });
userSessionSchema.index({ isOnline: 1 });
userSessionSchema.index({ lastSeen: -1 });
userSessionSchema.index({ socketId: 1 });

// Update the updatedAt field before saving
userSessionSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Method to set user online
userSessionSchema.methods.setOnline = function (socketId, deviceInfo = {}, ipAddress = null) {
  this.isOnline = true;
  this.socketId = socketId;
  this.lastSeen = new Date();
  this.deviceInfo = deviceInfo;
  this.ipAddress = ipAddress;
  return this;
};

// Method to set user offline
userSessionSchema.methods.setOffline = function () {
  this.isOnline = false;
  this.socketId = null;
  this.lastSeen = new Date();
  this.activeConversations = []; // Clear active conversations when going offline
  return this;
};

// Method to join conversation
userSessionSchema.methods.joinConversation = function (conversationId) {
  const existingConversation = this.activeConversations.find(
    conv => conv.conversationId.toString() === conversationId.toString()
  );
  
  if (!existingConversation) {
    this.activeConversations.push({
      conversationId,
      joinedAt: new Date()
    });
  }
  
  return this;
};

// Method to leave conversation
userSessionSchema.methods.leaveConversation = function (conversationId) {
  this.activeConversations = this.activeConversations.filter(
    conv => conv.conversationId.toString() !== conversationId.toString()
  );
  return this;
};

// Method to check if user is in conversation
userSessionSchema.methods.isInConversation = function (conversationId) {
  return this.activeConversations.some(
    conv => conv.conversationId.toString() === conversationId.toString()
  );
};

// Method to get time since last seen
userSessionSchema.methods.getTimeSinceLastSeen = function () {
  if (this.isOnline) {
    return 0; // Currently online
  }
  
  const now = new Date();
  const lastSeen = new Date(this.lastSeen);
  return Math.floor((now - lastSeen) / 1000); // Return seconds
};

// Method to get formatted last seen text
userSessionSchema.methods.getLastSeenText = function () {
  if (this.isOnline) {
    return "Online";
  }
  
  const secondsAgo = this.getTimeSinceLastSeen();
  
  if (secondsAgo < 60) {
    return "Just now";
  } else if (secondsAgo < 3600) {
    const minutes = Math.floor(secondsAgo / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (secondsAgo < 86400) {
    const hours = Math.floor(secondsAgo / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(secondsAgo / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
};

// Static method to find or create user session
userSessionSchema.statics.findOrCreate = async function (userId, socketId = null, deviceInfo = {}, ipAddress = null) {
  let session = await this.findOne({ userId });
  
  if (!session) {
    session = new this({
      userId,
      socketId,
      isOnline: !!socketId,
      deviceInfo,
      ipAddress,
      lastSeen: new Date()
    });
  } else if (socketId) {
    session.setOnline(socketId, deviceInfo, ipAddress);
  }
  
  await session.save();
  return session;
};

// Static method to get online users
userSessionSchema.statics.getOnlineUsers = function () {
  return this.find({ isOnline: true })
    .populate("userId", "name photo role")
    .sort({ lastSeen: -1 });
};

// Static method to get users online in specific conversations
userSessionSchema.statics.getOnlineUsersInConversations = function (conversationIds) {
  return this.find({
    isOnline: true,
    "activeConversations.conversationId": { $in: conversationIds }
  })
    .populate("userId", "name photo role")
    .sort({ lastSeen: -1 });
};

// Static method to cleanup stale sessions (users offline for more than 24 hours)
userSessionSchema.statics.cleanupStaleSessions = function () {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  return this.updateMany(
    {
      isOnline: false,
      lastSeen: { $lt: oneDayAgo }
    },
    {
      $set: {
        activeConversations: [],
        socketId: null
      }
    }
  );
};

// Static method to set user offline by socket ID
userSessionSchema.statics.setOfflineBySocketId = function (socketId) {
  return this.findOneAndUpdate(
    { socketId },
    {
      $set: {
        isOnline: false,
        socketId: null,
        lastSeen: new Date(),
        activeConversations: []
      }
    },
    { new: true }
  ).populate("userId", "name photo role");
};

// Static method to get user session with user details
userSessionSchema.statics.getUserSessionWithDetails = function (userId) {
  return this.findOne({ userId })
    .populate("userId", "name contact role photo")
    .populate("activeConversations.conversationId", "serviceId lastMessage");
};

// Static method to get session statistics
userSessionSchema.statics.getSessionStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        onlineUsers: {
          $sum: { $cond: ["$isOnline", 1, 0] }
        },
        offlineUsers: {
          $sum: { $cond: ["$isOnline", 0, 1] }
        },
        averageConversationsPerUser: {
          $avg: { $size: "$activeConversations" }
        }
      }
    }
  ]);
};

const UserSession = mongoose.model("UserSession", userSessionSchema);
export default UserSession;