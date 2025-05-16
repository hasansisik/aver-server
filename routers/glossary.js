const express = require("express");
const {
  getAllGlossaryTerms,
  getGlossaryTermBySlug,
  getGlossaryTermById,
  createGlossaryTerm,
  updateGlossaryTerm,
  deleteGlossaryTerm
} = require("../controllers/glossary");
const { isAuthenticated } = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes to get glossary terms
router.get("/", getAllGlossaryTerms);
// Route to get term by ID must come before the slug route to avoid conflicts
router.get("/id/:termId", getGlossaryTermById);
router.get("/:slug", getGlossaryTermBySlug);

// Admin routes to manage glossary terms
router.post("/create", isAuthenticated, createGlossaryTerm);
router.put("/:termId", isAuthenticated, updateGlossaryTerm);
router.delete("/:termId", isAuthenticated, deleteGlossaryTerm);

module.exports = router; 