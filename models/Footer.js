const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const FooterLinkSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  link: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
});

const FooterSchema = new Schema(
  {
    footerMenu: [FooterLinkSchema],
    socialLinks: [FooterLinkSchema],
    ctaText: { type: String, trim: true, default: "Let's make something" },
    ctaLink: { type: String, trim: true, default: "/contact" },
    copyright: { type: String, trim: true, default: "© 2023 Aver. All rights reserved." },
    developerInfo: { type: String, trim: true, default: "Developed by Platol" },
    developerLink: { type: String, trim: true, default: "https://themeforest.net/user/platol/portfolio" },
    isActive: { type: Boolean, default: true },
    user: { type: mongoose.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

const Footer = mongoose.model("Footer", FooterSchema);

module.exports = Footer; 