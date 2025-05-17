const Service = require("../models/Service");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const slugify = require("slugify");
const mongoose = require("mongoose");

// Get all services without filtering
const getAllServices = async (req, res) => {
  try {
    const queryObject = { isActive: true };
    
    // Get all active services
    const services = await Service.find(queryObject)
      .sort({ createdAt: -1 })
      .select('-contentBlocks'); // Exclude content blocks for performance
    
    res.status(StatusCodes.OK).json({ 
      services,
      totalServices: services.length,
      currentPage: 1,
      totalPages: 1
    });
  } catch (error) {
    console.error("getAllServices error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Servisler alınırken bir hata oluştu",
      error: error.message 
    });
  }
};

// Get a single service by slug
const getServiceBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    console.log("getServiceBySlug called with slug:", slug);
    
    const service = await Service.findOne({ slug, isActive: true });
    
    if (!service) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Servis bulunamadı"
      });
    }
    
    // If there's markdown content but no content blocks, convert markdown to basic content blocks
    if (service.markdownContent && (!service.contentBlocks || service.contentBlocks.length === 0)) {
      // This is a simple conversion - in a real app, you'd use a proper markdown parser
      service.contentBlocks = [{
        type: 'text',
        content: service.markdownContent,
        order: 0
      }];
    }
    
    res.status(StatusCodes.OK).json({ service });
  } catch (error) {
    console.error("getServiceBySlug error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Servis alınırken bir hata oluştu",
      error: error.message 
    });
  }
};

// Get a single service by ID
const getServiceById = async (req, res) => {
  try {
    const { serviceId } = req.params;
    console.log("getServiceById called with serviceId:", serviceId);
    
    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      console.error("Invalid MongoDB ObjectId format:", serviceId);
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Geçersiz servis ID formatı"
      });
    }
    
    const service = await Service.findById(serviceId);
    console.log("Service found:", service ? "Yes" : "No");
    
    if (!service || !service.isActive) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Servis bulunamadı"
      });
    }
    
    res.status(StatusCodes.OK).json({ service });
  } catch (error) {
    console.error("getServiceById error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Servis alınırken bir hata oluştu",
      error: error.message 
    });
  }
};

// Create a new service
const createService = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      icon,
      image, 
      contentBlocks, 
      features, 
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
        message: "Yetkiniz yok. Servis oluşturmak için admin veya user rolü gerekli." 
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
    const existingService = await Service.findOne({ slug });
    if (existingService) {
      slug = `${slug}-${Date.now()}`;
    }
    
    // Create service with given content
    const service = await Service.create({
      title,
      description,
      icon,
      image,
      slug,
      contentBlocks: contentBlocks || [],
      markdownContent,
      features: features || [],
      user: req.user.userId
    });
    
    res.status(StatusCodes.CREATED).json({ service });
  } catch (error) {
    console.error("createService error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Servis oluşturulurken bir hata oluştu",
      error: error.message 
    });
  }
};

// Update a service
const updateService = async (req, res) => {
  try {
    const { serviceId } = req.params;
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
        message: "Yetkiniz yok. Servis güncellemek için admin veya user rolü gerekli." 
      });
    }
    
    const service = await Service.findById(serviceId);
    
    if (!service) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Servis bulunamadı"
      });
    }
    
    // Check if title is being updated, then update slug
    if (updates.title && updates.title !== service.title) {
      let newSlug = slugify(updates.title, { lower: true });
      
      // Check if new slug already exists
      const existingService = await Service.findOne({ 
        slug: newSlug, 
        _id: { $ne: serviceId } 
      });
      
      if (existingService) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
      
      updates.slug = newSlug;
    }
    
    // Remove isPublished from updates if present
    if (updates.hasOwnProperty('isPublished')) {
      delete updates.isPublished;
    }
    
    // Update service fields
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'user' && key !== 'createdAt') {
        service[key] = updates[key];
      }
    });
    
    await service.save();
    
    res.status(StatusCodes.OK).json({ service });
  } catch (error) {
    console.error("updateService error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Servis güncellenirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Delete a service (soft delete by setting isActive to false)
const deleteService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kimlik doğrulama gerekli" 
      });
    }
    
    // İzin verilen roller: 'admin' veya 'user'
    const allowedRoles = ['admin', 'user', 'editör'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Yetkiniz yok. Servis silmek için admin veya user rolü gerekli." 
      });
    }
    
    const service = await Service.findById(serviceId);
    
    if (!service) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Servis bulunamadı"
      });
    }
    
    // Soft delete by setting isActive to false
    service.isActive = false;
    await service.save();
    
    res.status(StatusCodes.OK).json({ message: "Servis başarıyla silindi" });
  } catch (error) {
    console.error("deleteService error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Servis silinirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Add a content block to a service
const addContentBlock = async (req, res) => {
  try {
    const { serviceId } = req.params;
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
    
    const service = await Service.findById(serviceId);
    
    if (!service) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Servis bulunamadı"
      });
    }
    
    // Find highest order to append new block at the end
    let order = 0;
    if (service.contentBlocks.length > 0) {
      order = Math.max(...service.contentBlocks.map(block => block.order || 0)) + 1;
    }
    
    // Add new content block
    service.contentBlocks.push({
      type,
      content,
      metadata,
      order
    });
    
    await service.save();
    
    res.status(StatusCodes.OK).json({ service });
  } catch (error) {
    console.error("addContentBlock error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "İçerik bloğu eklenirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Remove a content block from a service
const removeContentBlock = async (req, res) => {
  try {
    const { serviceId } = req.params;
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
    
    const service = await Service.findById(serviceId);
    
    if (!service) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Servis bulunamadı"
      });
    }
    
    // Remove the content block
    service.contentBlocks = service.contentBlocks.filter(
      block => block._id.toString() !== blockId
    );
    
    await service.save();
    
    res.status(StatusCodes.OK).json({ service });
  } catch (error) {
    console.error("removeContentBlock error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "İçerik bloğu silinirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Reorder content blocks within a service
const reorderContentBlocks = async (req, res) => {
  try {
    const { serviceId } = req.params;
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
    
    const service = await Service.findById(serviceId);
    
    if (!service) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Servis bulunamadı"
      });
    }
    
    // Update block orders based on provided array
    blocks.forEach(item => {
      const block = service.contentBlocks.find(b => b._id.toString() === item.id);
      if (block) {
        block.order = item.order;
      }
    });
    
    // Sort blocks by order
    service.contentBlocks.sort((a, b) => a.order - b.order);
    
    await service.save();
    
    res.status(StatusCodes.OK).json({ service });
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
    const { serviceId } = req.params;
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
    
    const service = await Service.findById(serviceId);
    
    if (!service) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Servis bulunamadı"
      });
    }
    
    // Find and update the block
    const block = service.contentBlocks.find(b => b._id.toString() === blockId);
    
    if (!block) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "İçerik bloğu bulunamadı"
      });
    }
    
    if (type) block.type = type;
    if (content) block.content = content;
    if (metadata) block.metadata = metadata;
    
    await service.save();
    
    res.status(StatusCodes.OK).json({ service });
  } catch (error) {
    console.error("updateContentBlock error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "İçerik bloğu güncellenirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Add or update a service feature
const updateFeature = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { featureId, title, order } = req.body;
    
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kimlik doğrulama gerekli" 
      });
    }
    
    // İzin verilen roller: 'admin' veya 'user'
    const allowedRoles = ['admin', 'user', 'editör'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Yetkiniz yok. Özellik güncellemek için admin veya user rolü gerekli." 
      });
    }
    
    if (!title) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Özellik başlığı gereklidir"
      });
    }
    
    const service = await Service.findById(serviceId);
    
    if (!service) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Servis bulunamadı"
      });
    }
    
    // If featureId is provided, update existing feature
    if (featureId) {
      const featureIndex = service.features.findIndex(f => f._id.toString() === featureId);
      
      if (featureIndex === -1) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: "Özellik bulunamadı"
        });
      }
      
      service.features[featureIndex].title = title;
      if (order !== undefined) {
        service.features[featureIndex].order = order;
      }
    } else {
      // Add new feature
      let newOrder = 0;
      if (service.features.length > 0) {
        newOrder = Math.max(...service.features.map(f => f.order || 0)) + 1;
      }
      
      service.features.push({
        title,
        order: order !== undefined ? order : newOrder
      });
    }
    
    // Sort features by order
    service.features.sort((a, b) => a.order - b.order);
    
    await service.save();
    
    res.status(StatusCodes.OK).json({ service });
  } catch (error) {
    console.error("updateFeature error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Özellik güncellenirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Remove a feature from a service
const removeFeature = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { featureId } = req.body;
    
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kimlik doğrulama gerekli" 
      });
    }
    
    // İzin verilen roller: 'admin' veya 'user'
    const allowedRoles = ['admin', 'user', 'editör'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Yetkiniz yok. Özellik silmek için admin veya user rolü gerekli." 
      });
    }
    
    if (!featureId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Özellik ID'si gereklidir"
      });
    }
    
    const service = await Service.findById(serviceId);
    
    if (!service) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Servis bulunamadı"
      });
    }
    
    // Remove the feature
    service.features = service.features.filter(
      feature => feature._id.toString() !== featureId
    );
    
    await service.save();
    
    res.status(StatusCodes.OK).json({ service });
  } catch (error) {
    console.error("removeFeature error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Özellik silinirken bir hata oluştu",
      error: error.message 
    });
  }
};

module.exports = {
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
}; 