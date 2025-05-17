const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/authMiddleware");


const {
  getAllServices,
  getServiceBySlug,
  getServiceById,
  createService,
  updateService,
  deleteService,
  addContentBlock,
  removeContentBlock,
  reorderContentBlocks,
  updateContentBlock,
  updateFeature,
  removeFeature
} = require("../controllers/service");

// GET routes
router.get("/", getAllServices);
router.get("/:slug", getServiceBySlug);
router.get("/id/:serviceId", getServiceById);

// POST routes
router.post("/create", isAuthenticated, createService);
router.post("/:serviceId/blocks", isAuthenticated, addContentBlock);
router.post("/:serviceId/features", isAuthenticated, updateFeature);

// PUT routes
router.put("/:serviceId", isAuthenticated, updateService);
router.put("/:serviceId/blocks/reorder", isAuthenticated, reorderContentBlocks);
router.put("/:serviceId/blocks/update", isAuthenticated, updateContentBlock);
router.put("/:serviceId/features/update", isAuthenticated, updateFeature);

// DELETE routes
router.delete("/:serviceId", isAuthenticated, deleteService);
router.delete("/:serviceId/blocks", isAuthenticated, removeContentBlock);
router.delete("/:serviceId/features", isAuthenticated, removeFeature);

module.exports = router; 