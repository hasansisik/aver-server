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

const BlogSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    image: { type: String, trim: true },
    date: { type: Date, default: Date.now },
    category: { type: String, trim: true },
    slug: { type: String, required: true, trim: true, unique: true },
    contentBlocks: [ContentBlockSchema],
    markdownContent: { type: String, trim: true }, // Added for full markdown content
    subtitle: { type: String, trim: true }, // Added for frontmatter subtitle
    author: { type: String, trim: true }, // Added for blog post author
    tags: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
    user: { type: mongoose.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

// Create a text index for searching
BlogSchema.index({ title: 'text', description: 'text', markdownContent: 'text' });

const Blog = mongoose.model("Blog", BlogSchema);

module.exports = Blog; 