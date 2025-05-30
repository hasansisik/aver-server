const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Schema for service features
const FeatureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  order: { type: Number, default: 0 },
  content: { type: String, trim: true }, // Added content field for each feature
  icon: { type: String, trim: true }, // Optional icon for the feature
  image: { type: String, trim: true } // Optional image for the feature
});

const ServiceSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    icon: { type: String, trim: true },
    image: { type: String, trim: true },
    slug: { type: String, required: true, trim: true, unique: true },
    markdownContent: { type: String, trim: true }, // Main service content
    features: [FeatureSchema], // Service features list with content
    isActive: { type: Boolean, default: true },
    user: { type: mongoose.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

// Create a text index for searching
ServiceSchema.index({ title: 'text', description: 'text', markdownContent: 'text' });

const Service = mongoose.model("Service", ServiceSchema);

module.exports = Service; 