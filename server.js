require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./config/db");
const cloudinary = require("./config/cloudinary");

// Connect to MongoDB
connectDB();

// Initialize Cloudinary
console.log("✅ Cloudinary initialized with cloud name:", process.env.CLOUDINARY_CLOUD_NAME);

const app = express();

// Middleware
app.use(helmet());                        // Security headers
app.use(cors());                          // Enable CORS
app.use(morgan("dev"));                   // HTTP request logger
app.use(express.json());                  // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 Server is running!",
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/projects", require("./routes/projectRoutes"));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
