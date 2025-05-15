const express = require("express");
const {
  getFooter,
  updateFooter,
  addMenuItem,
  removeMenuItem,
  reorderMenuItems
} = require("../controllers/footer");
const { isAuthenticated } = require("../middleware/authMiddleware");

const router = express.Router();

// Public route to get footer data
router.get("/", getFooter);

// Admin routes to manage footer
router.put("/update", isAuthenticated, updateFooter);
router.post("/add-menu-item", isAuthenticated, addMenuItem);
router.delete("/remove-menu-item", isAuthenticated, removeMenuItem);
router.put("/reorder-menu-items", isAuthenticated, reorderMenuItems);

module.exports = router; 