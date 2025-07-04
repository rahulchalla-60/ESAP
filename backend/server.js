import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import cors from 'cors';
import userRoutes from "./routes/userRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
dotenv.config();

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 5000;  

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
// Connect to MongoDB
connectDB();

app.use("/api/users", userRoutes);
app.use("/api/services", serviceRoutes);
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 