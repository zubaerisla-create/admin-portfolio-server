const mongoose = require("mongoose");

// Cache connection across serverless invocations (Vercel)
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log("♻️  Reusing existing MongoDB connection");
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Don't call process.exit(1) on Vercel — let the error bubble up gracefully
    throw error;
  }
};

module.exports = connectDB;
