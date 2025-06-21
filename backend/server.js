import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
dotenv.config();
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 5000;  


// Connect to MongoDB
connectDB();

app.use("/api/users", userRoutes);
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 