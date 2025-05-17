const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Schema for different content block types
const ContentBlockSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true, 
    enum: ['text', 'image', 'code', 'quote', 'video', 'table', 'list'] 
  },
  content: { type: String, required: true },
  order: { type: Number, default: 0 },
  metadata: { type: Schema.Types.Mixed }, // For additional data like image URLs, code language, etc.
});

// Schema for project info
const ProjectInfoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  data: { type: String, required: true }
});

const ProjectSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    image: { type: String, trim: true },
    date: { type: Date, default: Date.now },
    category: { type: String, trim: true },
    color: { type: String, trim: true, default: "#000000" },
    slug: { type: String, required: true, trim: true, unique: true },
    contentBlocks: [ContentBlockSchema],
    markdownContent: { type: String, trim: true }, // Full markdown content
    projectInfo: [ProjectInfoSchema], // Client, Timeline, Services, Website
    isActive: { type: Boolean, default: true },
    user: { type: mongoose.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

// Create a text index for searching
ProjectSchema.index({ title: 'text', description: 'text', markdownContent: 'text' });

const Project = mongoose.model("Project", ProjectSchema);

module.exports = Project; 