const express = require("express");
const {
  getAllProjects,
  getProjectBySlug,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addContentBlock,
  removeContentBlock,
  reorderContentBlocks,
  updateContentBlock
} = require("../controllers/project");
const { isAuthenticated } = require("../middleware/authMiddleware");

const router = express.Router();

// Public route to get all projects (no query parameters)
router.get("/", getAllProjects);
// Route to get project by ID must come before the slug route to avoid conflicts
router.get("/id/:projectId", getProjectById);
router.get("/:slug", getProjectBySlug);

// Admin routes to manage project posts
router.post("/create", isAuthenticated, createProject);
router.put("/:projectId", isAuthenticated, updateProject);
router.delete("/:projectId", isAuthenticated, deleteProject);

// Content block operations
router.post("/:projectId/blocks", isAuthenticated, addContentBlock);
router.delete("/:projectId/blocks", isAuthenticated, removeContentBlock);
router.put("/:projectId/blocks/reorder", isAuthenticated, reorderContentBlocks);
router.put("/:projectId/blocks/update", isAuthenticated, updateContentBlock);

module.exports = router; 