const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const HeaderLinkSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  link: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
});

const HeaderSchema = new Schema(
  {
    mainMenu: [HeaderLinkSchema],
    socialLinks: [HeaderLinkSchema],
    logoText: { type: String, trim: true, default: "Aver" },
    logoUrl: { 
      type: String, 
      default: "/images/logo.png"
    },
    isActive: { type: Boolean, default: true },
    user: { type: mongoose.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

const Header = mongoose.model("Header", HeaderSchema);

module.exports = Header; 