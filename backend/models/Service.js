import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  serviceName: {
    type: String,
    required: true,
  },
  description: String,
  price: {
    type: Number,
    required: true,
  },
  media: [
    {
      data: Buffer,
      contentType: String,
      filename: String,
    }
  ], // Store files directly in MongoDB
  ratings: {
    type: Number,
    default: 0,
  },
  reviews: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      comment: String,
      stars: { type: Number, min: 1, max: 5 },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Service = mongoose.model("Service", serviceSchema);
export default Service;
