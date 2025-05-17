const Header = require("../models/Header");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

// Get the main header data
const getHeader = async (req, res) => {
  try {
    const header = await Header.findOne({ isActive: true });

    if (!header) {
      // Eğer header bulunamazsa, yeni bir header oluşturalım
      const newHeader = await Header.create({
        mainMenu: [],
        socialLinks: [],
        logoText: "Aver",
        logoUrl: "/images/logo.png",
        isActive: true
      });
      
      return res.status(StatusCodes.OK).json({ header: newHeader });
    }

    res.status(StatusCodes.OK).json({ header });
  } catch (error) {
    console.error("getHeader error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Header verileri alınırken bir hata oluştu",
      error: error.message 
    });
  }
};

// Update header data
const updateHeader = async (req, res) => {
  try {
    const { mainMenu, socialLinks, logoText, logoUrl } = req.body;

    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kimlik doğrulama gerekli" 
      });
    }

    // İzin verilen roller: 'admin' veya 'user'
    const allowedRoles = ['admin', 'user', 'editör'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Yetkiniz yok. Header güncellemek için admin veya user rolü gerekli." 
      });
    }

    const header = await Header.findOne({ isActive: true });

    if (!header) {
      // Create new header if none exists
      const newHeader = await Header.create({
        mainMenu,
        socialLinks,
        logoText,
        logoUrl,
        user: req.user.userId,
        isActive: true
      });
      return res.status(StatusCodes.CREATED).json({ header: newHeader });
    }

    // Update existing header
    if (mainMenu) header.mainMenu = mainMenu;
    if (socialLinks) header.socialLinks = socialLinks;
    if (logoText) header.logoText = logoText;
    if (logoUrl) header.logoUrl = logoUrl;
    
    await header.save();
    
    res.status(StatusCodes.OK).json({ header });
  } catch (error) {
    console.error("updateHeader error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Header güncellenirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Add menu item to header
const addMenuItem = async (req, res) => {
  try {
    const { name, link, type } = req.body;

    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kimlik doğrulama gerekli" 
      });
    }

    // İzin verilen roller: 'admin' veya 'user'
    const allowedRoles = ['admin', 'user', 'editör'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Yetkiniz yok. Menü öğesi eklemek için admin veya user rolü gerekli." 
      });
    }

    if (!name || !link || !type) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        message: "Lütfen name, link ve type (mainMenu veya socialLinks) değerlerini sağlayın" 
      });
    }

    const header = await Header.findOne({ isActive: true });

    if (!header) {
      // Header yoksa yeni bir tane oluşturalım
      const initialMenu = type === 'mainMenu' 
        ? [{ name, link, isActive: true, order: 0 }] 
        : [];
        
      const initialSocial = type === 'socialLinks' 
        ? [{ name, link, isActive: true, order: 0 }] 
        : [];
        
      const newHeader = await Header.create({
        mainMenu: initialMenu,
        socialLinks: initialSocial,
        logoText: "Aver",
        logoUrl: "/images/logo.png",
        isActive: true,
        user: req.user.userId
      });
      
      return res.status(StatusCodes.CREATED).json({ header: newHeader });
    }

    let order = 0;
    if (type === 'mainMenu' && header.mainMenu.length > 0) {
      // Mevcut öğelerde en yüksek sıra değerini buluyoruz
      order = Math.max(...header.mainMenu.map(item => item.order || 0)) + 1;
    } else if (type === 'socialLinks' && header.socialLinks.length > 0) {
      order = Math.max(...header.socialLinks.map(item => item.order || 0)) + 1;
    }

    if (type === 'mainMenu') {
      header.mainMenu.push({ name, link, isActive: true, order });
    } else if (type === 'socialLinks') {
      header.socialLinks.push({ name, link, isActive: true, order });
    } else {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        message: "Type must be mainMenu or socialLinks" 
      });
    }

    await header.save();
    
    res.status(StatusCodes.OK).json({ header });
  } catch (error) {
    console.error("addMenuItem error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Menü öğesi eklenirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Remove menu item from header
const removeMenuItem = async (req, res) => {
  try {
    const { itemId, type } = req.body;

    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kimlik doğrulama gerekli" 
      });
    }

    // İzin verilen roller: 'admin' veya 'user'
    const allowedRoles = ['admin', 'user', 'editör'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Yetkiniz yok. Menü öğesi silmek için admin veya user rolü gerekli." 
      });
    }

    if (!itemId || !type) {
      throw new CustomError.BadRequestError("Please provide itemId and type (mainMenu or socialLinks)");
    }

    const header = await Header.findOne({ isActive: true });

    if (!header) {
      throw new CustomError.NotFoundError("Header not found");
    }

    if (type === 'mainMenu') {
      header.mainMenu = header.mainMenu.filter(item => item._id.toString() !== itemId);
    } else if (type === 'socialLinks') {
      header.socialLinks = header.socialLinks.filter(item => item._id.toString() !== itemId);
    } else {
      throw new CustomError.BadRequestError("Type must be mainMenu or socialLinks");
    }

    await header.save();
    
    res.status(StatusCodes.OK).json({ header });
  } catch (error) {
    console.error("removeMenuItem error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Menü öğesi silinirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Reorder menu items
const reorderMenuItems = async (req, res) => {
  try {
    const { items, type } = req.body;

    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kimlik doğrulama gerekli" 
      });
    }

    // İzin verilen roller: 'admin' veya 'user'
    const allowedRoles = ['admin', 'user', 'editör'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Yetkiniz yok. Menü öğelerini sıralamak için admin veya user rolü gerekli." 
      });
    }

    if (!items || !type || !Array.isArray(items)) {
      throw new CustomError.BadRequestError("Please provide items array and type (mainMenu or socialLinks)");
    }

    const header = await Header.findOne({ isActive: true });

    if (!header) {
      throw new CustomError.NotFoundError("Header not found");
    }

    // items dizisi [{id: "id1", order: 0}, {id: "id2", order: 1}] şeklinde olmalı
    if (type === 'mainMenu') {
      // Yeni sıralama bilgisini map ile işliyoruz
      items.forEach(item => {
        const menuItem = header.mainMenu.find(mi => mi._id.toString() === item.id);
        if (menuItem) {
          menuItem.order = item.order;
        }
      });
      
      // Sıralamayı güncelliyoruz
      header.mainMenu.sort((a, b) => a.order - b.order);
    } else if (type === 'socialLinks') {
      items.forEach(item => {
        const socialLink = header.socialLinks.find(sl => sl._id.toString() === item.id);
        if (socialLink) {
          socialLink.order = item.order;
        }
      });
      
      header.socialLinks.sort((a, b) => a.order - b.order);
    } else {
      throw new CustomError.BadRequestError("Type must be mainMenu or socialLinks");
    }

    await header.save();
    
    res.status(StatusCodes.OK).json({ header });
  } catch (error) {
    console.error("reorderMenuItems error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Menü öğeleri yeniden sıralanırken bir hata oluştu",
      error: error.message 
    });
  }
};

module.exports = {
  getHeader,
  updateHeader,
  addMenuItem,
  removeMenuItem,
  reorderMenuItems
}; 