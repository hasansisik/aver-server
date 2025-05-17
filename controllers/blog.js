const Blog = require("../models/Blog");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const slugify = require("slugify");
const mongoose = require("mongoose");

// Get all blog posts without filtering
const getAllBlogs = async (req, res) => {
  try {
    const queryObject = { isActive: true };
    
    // Get all active blogs
    const blogs = await Blog.find(queryObject)
      .sort({ date: -1 })
      .select('-contentBlocks'); // Exclude content blocks for performance
    
    res.status(StatusCodes.OK).json({ 
      blogs,
      totalBlogs: blogs.length,
      currentPage: 1,
      totalPages: 1
    });
  } catch (error) {
    console.error("getAllBlogs error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Blog posts alınırken bir hata oluştu",
      error: error.message 
    });
  }
};

// Get a single blog post by slug
const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    console.log("getBlogBySlug called with slug:", slug);
    
    const blog = await Blog.findOne({ slug, isActive: true });
    
    if (!blog) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Blog post bulunamadı"
      });
    }
    
    // If there's markdown content but no content blocks, convert markdown to basic content blocks
    if (blog.markdownContent && (!blog.contentBlocks || blog.contentBlocks.length === 0)) {
      // This is a simple conversion - in a real app, you'd use a proper markdown parser
      blog.contentBlocks = [{
        type: 'text',
        content: blog.markdownContent,
        order: 0
      }];
    }
    
    res.status(StatusCodes.OK).json({ blog });
  } catch (error) {
    console.error("getBlogBySlug error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Blog post alınırken bir hata oluştu",
      error: error.message 
    });
  }
};

// Get a single blog post by ID
const getBlogById = async (req, res) => {
  try {
    const { blogId } = req.params;
    console.log("getBlogById called with blogId:", blogId);
    console.log("req.params:", JSON.stringify(req.params));
    
    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(blogId)) {
      console.error("Invalid MongoDB ObjectId format:", blogId);
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Geçersiz blog ID formatı"
      });
    }
    
    const blog = await Blog.findById(blogId);
    
    res.status(StatusCodes.OK).json({ blog });
  } catch (error) {
    console.error("getBlogById error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Blog post alınırken bir hata oluştu",
      error: error.message 
    });
  }
};

// Create a new blog post
const createBlog = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      image, 
      category, 
      contentBlocks, 
      tags, 
      markdownContent,
      subtitle,
      author
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
        message: "Yetkiniz yok. Blog oluşturmak için admin veya user rolü gerekli." 
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
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
      slug = `${slug}-${Date.now()}`;
    }
    
    // Create blog with given content
    const blog = await Blog.create({
      title,
      description,
      image,
      category,
      slug,
      contentBlocks: contentBlocks || [],
      markdownContent,
      subtitle,
      author,
      tags: tags || [],
      user: req.user.userId
    });
    
    res.status(StatusCodes.CREATED).json({ blog });
  } catch (error) {
    console.error("createBlog error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Blog oluşturulurken bir hata oluştu",
      error: error.message 
    });
  }
};

// Update a blog post
const updateBlog = async (req, res) => {
  try {
    const { blogId } = req.params;
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
        message: "Yetkiniz yok. Blog güncellemek için admin veya user rolü gerekli." 
      });
    }
    
    const blog = await Blog.findById(blogId);
    
    if (!blog) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Blog bulunamadı"
      });
    }
    
    // Check if title is being updated, then update slug
    if (updates.title && updates.title !== blog.title) {
      let newSlug = slugify(updates.title, { lower: true });
      
      // Check if new slug already exists
      const existingBlog = await Blog.findOne({ 
        slug: newSlug, 
        _id: { $ne: blogId } 
      });
      
      if (existingBlog) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
      
      updates.slug = newSlug;
    }
    
    // Remove isPublished from updates if present
    if (updates.hasOwnProperty('isPublished')) {
      delete updates.isPublished;
    }
    
    // Update blog fields
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'user' && key !== 'createdAt') {
        blog[key] = updates[key];
      }
    });
    
    await blog.save();
    
    res.status(StatusCodes.OK).json({ blog });
  } catch (error) {
    console.error("updateBlog error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Blog güncellenirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Delete a blog post (soft delete by setting isActive to false)
const deleteBlog = async (req, res) => {
  try {
    const { blogId } = req.params;
    
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kimlik doğrulama gerekli" 
      });
    }
    
    // İzin verilen roller: 'admin' veya 'user'
    const allowedRoles = ['admin', 'user', 'editör'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Yetkiniz yok. Blog silmek için admin veya user rolü gerekli." 
      });
    }
    
    const blog = await Blog.findById(blogId);
    
    if (!blog) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Blog bulunamadı"
      });
    }
    
    // Soft delete by setting isActive to false
    blog.isActive = false;
    await blog.save();
    
    res.status(StatusCodes.OK).json({ message: "Blog başarıyla silindi" });
  } catch (error) {
    console.error("deleteBlog error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Blog silinirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Add a content block to a blog post
const addContentBlock = async (req, res) => {
  try {
    const { blogId } = req.params;
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
    
    const blog = await Blog.findById(blogId);
    
    if (!blog) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Blog bulunamadı"
      });
    }
    
    // Find highest order to append new block at the end
    let order = 0;
    if (blog.contentBlocks.length > 0) {
      order = Math.max(...blog.contentBlocks.map(block => block.order || 0)) + 1;
    }
    
    // Add new content block
    blog.contentBlocks.push({
      type,
      content,
      metadata,
      order
    });
    
    await blog.save();
    
    res.status(StatusCodes.OK).json({ blog });
  } catch (error) {
    console.error("addContentBlock error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "İçerik bloğu eklenirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Remove a content block from a blog post
const removeContentBlock = async (req, res) => {
  try {
    const { blogId } = req.params;
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
    
    const blog = await Blog.findById(blogId);
    
    if (!blog) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Blog bulunamadı"
      });
    }
    
    // Remove the content block
    blog.contentBlocks = blog.contentBlocks.filter(
      block => block._id.toString() !== blockId
    );
    
    await blog.save();
    
    res.status(StatusCodes.OK).json({ blog });
  } catch (error) {
    console.error("removeContentBlock error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "İçerik bloğu silinirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Reorder content blocks within a blog post
const reorderContentBlocks = async (req, res) => {
  try {
    const { blogId } = req.params;
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
    
    const blog = await Blog.findById(blogId);
    
    if (!blog) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Blog bulunamadı"
      });
    }
    
    // Update block orders based on provided array
    blocks.forEach(item => {
      const block = blog.contentBlocks.find(b => b._id.toString() === item.id);
      if (block) {
        block.order = item.order;
      }
    });
    
    // Sort blocks by order
    blog.contentBlocks.sort((a, b) => a.order - b.order);
    
    await blog.save();
    
    res.status(StatusCodes.OK).json({ blog });
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
    const { blogId } = req.params;
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
    
    const blog = await Blog.findById(blogId);
    
    if (!blog) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Blog bulunamadı"
      });
    }
    
    // Find and update the block
    const block = blog.contentBlocks.find(b => b._id.toString() === blockId);
    
    if (!block) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "İçerik bloğu bulunamadı"
      });
    }
    
    if (type) block.type = type;
    if (content) block.content = content;
    if (metadata) block.metadata = metadata;
    
    await blog.save();
    
    res.status(StatusCodes.OK).json({ blog });
  } catch (error) {
    console.error("updateContentBlock error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "İçerik bloğu güncellenirken bir hata oluştu",
      error: error.message 
    });
  }
};

module.exports = {
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
}; 