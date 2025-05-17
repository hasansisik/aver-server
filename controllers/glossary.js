const Glossary = require("../models/Glossary");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const slugify = require("slugify");
const mongoose = require("mongoose");

// Get all glossary terms
const getAllGlossaryTerms = async (req, res) => {
  try {
    const queryObject = { isActive: true };
    
    // Get all active glossary terms
    const glossaryTerms = await Glossary.find(queryObject)
      .sort({ title: 1 });
    
    res.status(StatusCodes.OK).json({ 
      glossaryTerms,
      totalTerms: glossaryTerms.length
    });
  } catch (error) {
    console.error("getAllGlossaryTerms error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Sözlük terimleri alınırken bir hata oluştu",
      error: error.message 
    });
  }
};

// Get a single glossary term by slug
const getGlossaryTermBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const glossaryTerm = await Glossary.findOne({ slug, isActive: true });
    
    if (!glossaryTerm) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Sözlük terimi bulunamadı"
      });
    }
    
    res.status(StatusCodes.OK).json({ glossaryTerm });
  } catch (error) {
    console.error("getGlossaryTermBySlug error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Sözlük terimi alınırken bir hata oluştu",
      error: error.message 
    });
  }
};

// Get a single glossary term by ID
const getGlossaryTermById = async (req, res) => {
  try {
    const { termId } = req.params;
    
    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(termId)) {
      console.error("Invalid MongoDB ObjectId format:", termId);
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Geçersiz sözlük terimi ID formatı"
      });
    }
    
    const glossaryTerm = await Glossary.findById(termId);
    
    if (!glossaryTerm || !glossaryTerm.isActive) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Sözlük terimi bulunamadı"
      });
    }
    
    res.status(StatusCodes.OK).json({ glossaryTerm });
  } catch (error) {
    console.error("getGlossaryTermById error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Sözlük terimi alınırken bir hata oluştu",
      error: error.message 
    });
  }
};

// Create a new glossary term
const createGlossaryTerm = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      content, 
      category
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
        message: "Yetkiniz yok. Sözlük terimi oluşturmak için admin veya user rolü gerekli." 
      });
    }
    
    if (!title || !description) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Başlık ve açıklama alanları gereklidir"
      });
    }
    
    // Create slug from title
    let slug = slugify(title, { lower: true });
    
    // Check if slug already exists and make it unique if needed
    const existingTerm = await Glossary.findOne({ slug });
    if (existingTerm) {
      slug = `${slug}-${Date.now()}`;
    }
    
    // Create glossary term
    const glossaryTerm = await Glossary.create({
      title,
      description,
      content,
      category,
      slug,
      user: req.user.userId
    });
    
    res.status(StatusCodes.CREATED).json({ glossaryTerm });
  } catch (error) {
    console.error("createGlossaryTerm error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Sözlük terimi oluşturulurken bir hata oluştu",
      error: error.message 
    });
  }
};

// Update a glossary term
const updateGlossaryTerm = async (req, res) => {
  try {
    const { termId } = req.params;
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
        message: "Yetkiniz yok. Sözlük terimi güncellemek için admin veya user rolü gerekli." 
      });
    }
    
    const glossaryTerm = await Glossary.findById(termId);
    
    if (!glossaryTerm) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Sözlük terimi bulunamadı"
      });
    }
    
    // Check if title is being updated, then update slug
    if (updates.title && updates.title !== glossaryTerm.title) {
      let newSlug = slugify(updates.title, { lower: true });
      
      // Check if new slug already exists
      const existingTerm = await Glossary.findOne({ 
        slug: newSlug, 
        _id: { $ne: termId } 
      });
      
      if (existingTerm) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
      
      updates.slug = newSlug;
    }
    
    // Update glossary term fields
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'user' && key !== 'createdAt') {
        glossaryTerm[key] = updates[key];
      }
    });
    
    await glossaryTerm.save();
    
    res.status(StatusCodes.OK).json({ glossaryTerm });
  } catch (error) {
    console.error("updateGlossaryTerm error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Sözlük terimi güncellenirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Delete a glossary term (soft delete by setting isActive to false)
const deleteGlossaryTerm = async (req, res) => {
  try {
    const { termId } = req.params;
    
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kimlik doğrulama gerekli" 
      });
    }
    
    // İzin verilen roller: 'admin' veya 'user'
    const allowedRoles = ['admin', 'user', 'editör'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Yetkiniz yok. Sözlük terimi silmek için admin veya user rolü gerekli." 
      });
    }
    
    const glossaryTerm = await Glossary.findById(termId);
    
    if (!glossaryTerm) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Sözlük terimi bulunamadı"
      });
    }
    
    // Soft delete by setting isActive to false
    glossaryTerm.isActive = false;
    await glossaryTerm.save();
    
    res.status(StatusCodes.OK).json({ message: "Sözlük terimi başarıyla silindi" });
  } catch (error) {
    console.error("deleteGlossaryTerm error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Sözlük terimi silinirken bir hata oluştu",
      error: error.message 
    });
  }
};

module.exports = {
  getAllGlossaryTerms,
  getGlossaryTermBySlug,
  getGlossaryTermById,
  createGlossaryTerm,
  updateGlossaryTerm,
  deleteGlossaryTerm
}; 