const express = require("express");
const {
  getAllBlogs,
  getBlogBySlug,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  addContentBlock,
  removeContentBlock,
  reorderContentBlocks,
  updateContentBlock
} = require("../controllers/blog");
const { isAuthenticated } = require("../middleware/authMiddleware");

const router = express.Router();

// Public route to get all blogs (no query parameters)
router.get("/", getAllBlogs);
// Route to get blog by ID must come before the slug route to avoid conflicts
router.get("/id/:blogId", getBlogById);
router.get("/:slug", getBlogBySlug);

// Admin routes to manage blog posts
router.post("/create", isAuthenticated, createBlog);
router.put("/:blogId", isAuthenticated, updateBlog);
router.delete("/:blogId", isAuthenticated, deleteBlog);

// Content block operations
router.post("/:blogId/blocks", isAuthenticated, addContentBlock);
router.delete("/:blogId/blocks", isAuthenticated, removeContentBlock);
router.put("/:blogId/blocks/reorder", isAuthenticated, reorderContentBlocks);
router.put("/:blogId/blocks/update", isAuthenticated, updateContentBlock);

module.exports = router; 