const express = require("express");
const {
  getHeader,
  updateHeader,
  addMenuItem,
  removeMenuItem,
  reorderMenuItems
} = require("../controllers/header");
const { isAuthenticated } = require("../middleware/authMiddleware");

const router = express.Router();

// Public route to get header data
router.get("/", getHeader);

// Admin routes to manage header
router.put("/update", isAuthenticated, updateHeader);
router.post("/add-menu-item", isAuthenticated, addMenuItem);
router.delete("/remove-menu-item", isAuthenticated, removeMenuItem);
router.put("/reorder-menu-items", isAuthenticated, reorderMenuItems);

module.exports = router; 