import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema({
  title: String,
  description: String,
  image: String,
  latitude: Number,
  longitude: Number,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Report ||
  mongoose.model("Report", ReportSchema);