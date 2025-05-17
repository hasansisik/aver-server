const Project = require("../models/Project");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const slugify = require("slugify");
const mongoose = require("mongoose");

// Get all project posts without filtering
const getAllProjects = async (req, res) => {
  try {
    const queryObject = { isActive: true };
    
    // Get all active projects
    const projects = await Project.find(queryObject)
      .sort({ date: -1 })
      .select('-contentBlocks'); // Exclude content blocks for performance
    
    res.status(StatusCodes.OK).json({ 
      projects,
      totalProjects: projects.length,
      currentPage: 1,
      totalPages: 1
    });
  } catch (error) {
    console.error("getAllProjects error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Projeler alınırken bir hata oluştu",
      error: error.message 
    });
  }
};

// Get a single project post by slug
const getProjectBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    console.log("getProjectBySlug called with slug:", slug);
    
    const project = await Project.findOne({ slug, isActive: true });
    
    
    // If there's markdown content but no content blocks, convert markdown to basic content blocks
    if (project.markdownContent && (!project.contentBlocks || project.contentBlocks.length === 0)) {
      // This is a simple conversion - in a real app, you'd use a proper markdown parser
      project.contentBlocks = [{
        type: 'text',
        content: project.markdownContent,
        order: 0
      }];
    }
    
    res.status(StatusCodes.OK).json({ project });
  } catch (error) {
    console.error("getProjectBySlug error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Proje alınırken bir hata oluştu",
      error: error.message 
    });
  }
};

// Get a single project post by ID
const getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log("getProjectById called with projectId:", projectId);
    
    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      console.error("Invalid MongoDB ObjectId format:", projectId);
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Geçersiz proje ID formatı"
      });
    }
    
    const project = await Project.findById(projectId);
    console.log("Project found:", project ? "Yes" : "No");
    
    if (!project || !project.isActive) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Proje bulunamadı"
      });
    }
    
    res.status(StatusCodes.OK).json({ project });
  } catch (error) {
    console.error("getProjectById error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Proje alınırken bir hata oluştu",
      error: error.message 
    });
  }
};

// Create a new project post
const createProject = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      image, 
      category, 
      color,
      contentBlocks, 
      projectInfo,
      markdownContent
    } = req.body;
    
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kimlik doğrulama gerekli" 
      });
    }
    
    // İzin verilen roller: 'admin' veya 'user'
    const allowedRoles = ['admin', 'user', 'editör'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Yetkiniz yok. Proje oluşturmak için admin veya user rolü gerekli." 
      });
    }
    
    if (!title) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Başlık gereklidir"
      });
    }
    
    // Create slug from title
    let slug = slugify(title, { lower: true });
    
    // Check if slug already exists and make it unique if needed
    const existingProject = await Project.findOne({ slug });
    if (existingProject) {
      slug = `${slug}-${Date.now()}`;
    }
    
    // Create project with given content
    const project = await Project.create({
      title,
      description,
      image,
      category,
      color: color || "#000000",
      slug,
      contentBlocks: contentBlocks || [],
      markdownContent,
      projectInfo: projectInfo || [],
      user: req.user.userId
    });
    
    res.status(StatusCodes.CREATED).json({ project });
  } catch (error) {
    console.error("createProject error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Proje oluşturulurken bir hata oluştu",
      error: error.message 
    });
  }
};

// Update a project post
const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const updates = req.body;
    
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kimlik doğrulama gerekli" 
      });
    }
    
    // İzin verilen roller: 'admin' veya 'user'
    const allowedRoles = ['admin', 'user', 'editör'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Yetkiniz yok. Proje güncellemek için admin veya user rolü gerekli." 
      });
    }
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Proje bulunamadı"
      });
    }
    
    // Check if title is being updated, then update slug
    if (updates.title && updates.title !== project.title) {
      let newSlug = slugify(updates.title, { lower: true });
      
      // Check if new slug already exists
      const existingProject = await Project.findOne({ 
        slug: newSlug, 
        _id: { $ne: projectId } 
      });
      
      if (existingProject) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
      
      updates.slug = newSlug;
    }
    
    // Remove isPublished from updates if present
    if (updates.hasOwnProperty('isPublished')) {
      delete updates.isPublished;
    }
    
    // Update project fields
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'user' && key !== 'createdAt') {
        project[key] = updates[key];
      }
    });
    
    await project.save();
    
    res.status(StatusCodes.OK).json({ project });
  } catch (error) {
    console.error("updateProject error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Proje güncellenirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Delete a project post (soft delete by setting isActive to false)
const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kimlik doğrulama gerekli" 
      });
    }
    
    // İzin verilen roller: 'admin' veya 'user'
    const allowedRoles = ['admin', 'user', 'editör'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Yetkiniz yok. Proje silmek için admin veya user rolü gerekli." 
      });
    }
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Proje bulunamadı"
      });
    }
    
    // Soft delete by setting isActive to false
    project.isActive = false;
    await project.save();
    
    res.status(StatusCodes.OK).json({ message: "Proje başarıyla silindi" });
  } catch (error) {
    console.error("deleteProject error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Proje silinirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Add a content block to a project post
const addContentBlock = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { type, content, metadata } = req.body;
    
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kimlik doğrulama gerekli" 
      });
    }
    
    // İzin verilen roller: 'admin' veya 'user'
    const allowedRoles = ['admin', 'user', 'editör'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Yetkiniz yok. İçerik bloğu eklemek için admin veya user rolü gerekli." 
      });
    }
    
    if (!type || !content) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Tip ve içerik alanları gereklidir"
      });
    }
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Proje bulunamadı"
      });
    }
    
    // Find highest order to append new block at the end
    let order = 0;
    if (project.contentBlocks.length > 0) {
      order = Math.max(...project.contentBlocks.map(block => block.order || 0)) + 1;
    }
    
    // Add new content block
    project.contentBlocks.push({
      type,
      content,
      metadata,
      order
    });
    
    await project.save();
    
    res.status(StatusCodes.OK).json({ project });
  } catch (error) {
    console.error("addContentBlock error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "İçerik bloğu eklenirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Remove a content block from a project post
const removeContentBlock = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { blockId } = req.body;
    
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kimlik doğrulama gerekli" 
      });
    }
    
    // İzin verilen roller: 'admin' veya 'user'
    const allowedRoles = ['admin', 'user', 'editör'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Yetkiniz yok. İçerik bloğu silmek için admin veya user rolü gerekli." 
      });
    }
    
    if (!blockId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Blok ID'si gereklidir"
      });
    }
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Proje bulunamadı"
      });
    }
    
    // Remove the content block
    project.contentBlocks = project.contentBlocks.filter(
      block => block._id.toString() !== blockId
    );
    
    await project.save();
    
    res.status(StatusCodes.OK).json({ project });
  } catch (error) {
    console.error("removeContentBlock error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "İçerik bloğu silinirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Reorder content blocks within a project post
const reorderContentBlocks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { blocks } = req.body;
    
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kimlik doğrulama gerekli" 
      });
    }
    
    // İzin verilen roller: 'admin' veya 'user'
    const allowedRoles = ['admin', 'user', 'editör'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Yetkiniz yok. İçerik bloklarını sıralamak için admin veya user rolü gerekli." 
      });
    }
    
    if (!blocks || !Array.isArray(blocks)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Blok sıralama bilgileri gereklidir"
      });
    }
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Proje bulunamadı"
      });
    }
    
    // Update block orders based on provided array
    blocks.forEach(item => {
      const block = project.contentBlocks.find(b => b._id.toString() === item.id);
      if (block) {
        block.order = item.order;
      }
    });
    
    // Sort blocks by order
    project.contentBlocks.sort((a, b) => a.order - b.order);
    
    await project.save();
    
    res.status(StatusCodes.OK).json({ project });
  } catch (error) {
    console.error("reorderContentBlocks error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "İçerik blokları yeniden sıralanırken bir hata oluştu",
      error: error.message 
    });
  }
};

// Update a specific content block
const updateContentBlock = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { blockId, type, content, metadata } = req.body;
    
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kimlik doğrulama gerekli" 
      });
    }
    
    // İzin verilen roller: 'admin' veya 'user'
    const allowedRoles = ['admin', 'user', 'editör'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Yetkiniz yok. İçerik bloğu güncellemek için admin veya user rolü gerekli." 
      });
    }
    
    if (!blockId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Blok ID'si gereklidir"
      });
    }
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Proje bulunamadı"
      });
    }
    
    // Find and update the block
    const block = project.contentBlocks.find(b => b._id.toString() === blockId);
    
    if (!block) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "İçerik bloğu bulunamadı"
      });
    }
    
    if (type) block.type = type;
    if (content) block.content = content;
    if (metadata) block.metadata = metadata;
    
    await project.save();
    
    res.status(StatusCodes.OK).json({ project });
  } catch (error) {
    console.error("updateContentBlock error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "İçerik bloğu güncellenirken bir hata oluştu",
      error: error.message 
    });
  }
};

module.exports = {
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
}; 