import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import cors from 'cors';
import config from "./config/environment.js";
import userRoutes from "./routes/userRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import { setupSocketHandlers } from "./sockets/chatSocket.js";

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    credentials: true
  }
});

// Body parsing middleware with configurable limits
app.use(express.json({ limit: `${Math.floor(config.maxFileSize / (1024 * 1024))}mb` })); 
app.use(express.urlencoded({ limit: `${Math.floor(config.maxFileSize / (1024 * 1024))}mb`, extended: true }));

// CORS configuration using environment variables
app.use(cors({ 
  origin: config.corsOrigin, 
  credentials: true 
}));

// Connect to MongoDB
connectDB();

// Setup Socket.IO handlers
setupSocketHandlers(io);

app.use("/api/users", userRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/chat", chatRoutes);

// Error handling middleware (must be after routes)
app.use(notFound);
app.use(errorHandler);

// Start the server
httpServer.listen(config.port, () => {
  console.log(`Server is running on port ${config.port} in ${config.nodeEnv} mode`);
  console.log(`Socket.IO server initialized`);
}); 