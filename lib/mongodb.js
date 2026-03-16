import mongoose from "mongoose";

const MONGODB_URI = "mongodb://127.0.0.1:27017/lumen";

if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (global.mongoose.conn) return global.mongoose.conn;

  if (!global.mongoose.promise) {
    global.mongoose.promise = mongoose.connect(MONGODB_URI);
  }

  global.mongoose.conn = await global.mongoose.promise;
  return global.mongoose.conn;
}