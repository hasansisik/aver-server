const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const GlossarySchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    content: { type: String, trim: true },
    slug: { type: String, required: true, trim: true, unique: true },
    category: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    user: { type: mongoose.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

// Create a text index for searching
GlossarySchema.index({ title: 'text', description: 'text', content: 'text' });

const Glossary = mongoose.model("Glossary", GlossarySchema);

module.exports = Glossary; 