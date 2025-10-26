import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  content: {
    type: String,
    required: function() {
      return this.messageType === 'text' && (!this.attachments || this.attachments.length === 0);
    }
  },
  messageType: {
    type: String,
    enum: ["text", "image", "file"],
    default: "text"
  },
  attachments: [
    {
      fileName: {
        type: String,
        required: true
      },
      originalName: {
        type: String,
        required: true
      },
      data: {
        type: Buffer,
        required: true
      },
      contentType: {
        type: String,
        required: true
      },
      fileSize: {
        type: Number,
        required: true
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  status: {
    type: String,
    enum: ["sent", "delivered", "read"],
    default: "sent"
  },
  readBy: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      readAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  timestamp: {
    type: Date,
    default: Date.now
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message"
  }
});

// Create indexes for better query performance
messageSchema.index({ conversationId: 1, timestamp: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ status: 1 });
messageSchema.index({ conversationId: 1, isDeleted: 1, timestamp: -1 });

// Method to mark message as read by a user
messageSchema.methods.markAsRead = function (userId) {
  const existingRead = this.readBy.find(
    read => read.userId.toString() === userId.toString()
  );
  
  if (!existingRead) {
    this.readBy.push({
      userId,
      readAt: new Date()
    });
    
    // Update status to read if not already
    if (this.status !== 'read') {
      this.status = 'read';
    }
  }
  
  return this;
};

// Method to check if message was read by user
messageSchema.methods.isReadBy = function (userId) {
  return this.readBy.some(
    read => read.userId.toString() === userId.toString()
  );
};

// Method to edit message content
messageSchema.methods.editContent = function (newContent) {
  if (this.messageType === 'text') {
    this.content = newContent;
    this.editedAt = new Date();
  }
  return this;
};

// Method to soft delete message
messageSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this;
};

// Method to add attachment
messageSchema.methods.addAttachment = function (fileName, originalName, data, contentType, fileSize) {
  this.attachments.push({
    fileName,
    originalName,
    data,
    contentType,
    fileSize,
    uploadedAt: new Date()
  });
  
  // Update message type based on content type
  if (contentType.startsWith('image/')) {
    this.messageType = 'image';
  } else {
    this.messageType = 'file';
  }
  
  return this;
};

// Method to get attachment by index
messageSchema.methods.getAttachment = function (index) {
  return this.attachments[index] || null;
};

// Method to get total attachment size
messageSchema.methods.getTotalAttachmentSize = function () {
  return this.attachments.reduce((total, attachment) => total + attachment.fileSize, 0);
};

// Static method to get messages for a conversation with pagination
messageSchema.statics.getConversationMessages = function (conversationId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return this.find({
    conversationId,
    isDeleted: false
  })
    .populate("senderId", "name photo")
    .populate("replyTo", "content senderId timestamp")
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get unread messages for a user in a conversation
messageSchema.statics.getUnreadMessages = function (conversationId, userId) {
  return this.find({
    conversationId,
    senderId: { $ne: userId },
    isDeleted: false,
    "readBy.userId": { $ne: userId }
  })
    .populate("senderId", "name photo")
    .sort({ timestamp: 1 });
};

// Static method to mark multiple messages as read
messageSchema.statics.markMultipleAsRead = function (messageIds, userId) {
  return this.updateMany(
    {
      _id: { $in: messageIds },
      "readBy.userId": { $ne: userId }
    },
    {
      $push: {
        readBy: {
          userId,
          readAt: new Date()
        }
      },
      $set: {
        status: "read"
      }
    }
  );
};

// Static method to get message statistics for a conversation
messageSchema.statics.getConversationStats = function (conversationId) {
  return this.aggregate([
    {
      $match: {
        conversationId: new mongoose.Types.ObjectId(conversationId),
        isDeleted: false
      }
    },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        textMessages: {
          $sum: { $cond: [{ $eq: ["$messageType", "text"] }, 1, 0] }
        },
        imageMessages: {
          $sum: { $cond: [{ $eq: ["$messageType", "image"] }, 1, 0] }
        },
        fileMessages: {
          $sum: { $cond: [{ $eq: ["$messageType", "file"] }, 1, 0] }
        },
        totalAttachments: { $sum: { $size: "$attachments" } },
        firstMessage: { $min: "$timestamp" },
        lastMessage: { $max: "$timestamp" }
      }
    }
  ]);
};

// Pre-save middleware to update conversation's last message
messageSchema.post("save", async function (doc) {
  try {
    const Conversation = mongoose.model("Conversation");
    await Conversation.findByIdAndUpdate(
      doc.conversationId,
      {
        $set: {
          "lastMessage.content": doc.content || `[${doc.messageType}]`,
          "lastMessage.senderId": doc.senderId,
          "lastMessage.timestamp": doc.timestamp,
          "lastMessage.messageType": doc.messageType,
          updatedAt: new Date()
        }
      }
    );
  } catch (error) {
    console.error("Error updating conversation last message:", error);
  }
});

const Message = mongoose.model("Message", messageSchema);
export default Message;