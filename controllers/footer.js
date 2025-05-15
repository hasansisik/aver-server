const Footer = require("../models/Footer");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

// Get the main footer data
const getFooter = async (req, res) => {
  try {
    const footer = await Footer.findOne({ isActive: true });

    if (!footer) {
      // Eğer footer bulunamazsa, yeni bir footer oluşturalım
      const newFooter = await Footer.create({
        footerMenu: [],
        socialLinks: [],
        ctaText: "Let's make something",
        ctaLink: "/contact",
        copyright: "© 2023 Aver. All rights reserved.",
        developerInfo: "Developed by Platol",
        developerLink: "https://themeforest.net/user/platol/portfolio",
        isActive: true
      });
      
      return res.status(StatusCodes.OK).json({ footer: newFooter });
    }

    res.status(StatusCodes.OK).json({ footer });
  } catch (error) {
    console.error("getFooter error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Footer verileri alınırken bir hata oluştu",
      error: error.message 
    });
  }
};

// Update footer data
const updateFooter = async (req, res) => {
  try {
    const { footerMenu, socialLinks, ctaText, ctaLink, copyright, developerInfo, developerLink } = req.body;

    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: "Kimlik doğrulama gerekli" 
      });
    }

    // İzin verilen roller: 'admin' veya 'user'
    const allowedRoles = ['admin', 'user', 'editör'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: "Yetkiniz yok. Footer güncellemek için admin veya user rolü gerekli." 
      });
    }

    const footer = await Footer.findOne({ isActive: true });

    if (!footer) {
      // Create new footer if none exists
      const newFooter = await Footer.create({
        footerMenu,
        socialLinks,
        ctaText,
        ctaLink,
        copyright,
        developerInfo,
        developerLink,
        user: req.user.userId,
        isActive: true
      });
      return res.status(StatusCodes.CREATED).json({ footer: newFooter });
    }

    // Update existing footer
    if (footerMenu) footer.footerMenu = footerMenu;
    if (socialLinks) footer.socialLinks = socialLinks;
    if (ctaText) footer.ctaText = ctaText;
    if (ctaLink) footer.ctaLink = ctaLink;
    if (copyright) footer.copyright = copyright;
    if (developerInfo) footer.developerInfo = developerInfo;
    if (developerLink) footer.developerLink = developerLink;
    
    await footer.save();
    
    res.status(StatusCodes.OK).json({ footer });
  } catch (error) {
    console.error("updateFooter error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Footer güncellenirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Add menu item to footer
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
        message: "Lütfen name, link ve type (footerMenu veya socialLinks) değerlerini sağlayın" 
      });
    }

    const footer = await Footer.findOne({ isActive: true });

    if (!footer) {
      // Footer yoksa yeni bir tane oluşturalım
      const initialMenu = type === 'footerMenu' 
        ? [{ name, link, isActive: true, order: 0 }] 
        : [];
        
      const initialSocial = type === 'socialLinks' 
        ? [{ name, link, isActive: true, order: 0 }] 
        : [];
        
      const newFooter = await Footer.create({
        footerMenu: initialMenu,
        socialLinks: initialSocial,
        ctaText: "Let's make something",
        ctaLink: "/contact",
        copyright: "© 2023 Aver. All rights reserved.",
        developerInfo: "Developed by Platol",
        developerLink: "https://themeforest.net/user/platol/portfolio",
        isActive: true,
        user: req.user.userId
      });
      
      return res.status(StatusCodes.CREATED).json({ footer: newFooter });
    }

    let order = 0;
    if (type === 'footerMenu' && footer.footerMenu.length > 0) {
      // Mevcut öğelerde en yüksek sıra değerini buluyoruz
      order = Math.max(...footer.footerMenu.map(item => item.order || 0)) + 1;
    } else if (type === 'socialLinks' && footer.socialLinks.length > 0) {
      order = Math.max(...footer.socialLinks.map(item => item.order || 0)) + 1;
    }

    if (type === 'footerMenu') {
      footer.footerMenu.push({ name, link, isActive: true, order });
    } else if (type === 'socialLinks') {
      footer.socialLinks.push({ name, link, isActive: true, order });
    } else {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        message: "Type must be footerMenu or socialLinks" 
      });
    }

    await footer.save();
    
    res.status(StatusCodes.OK).json({ footer });
  } catch (error) {
    console.error("addMenuItem error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Menü öğesi eklenirken bir hata oluştu",
      error: error.message 
    });
  }
};

// Remove menu item from footer
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
      throw new CustomError.BadRequestError("Please provide itemId and type (footerMenu or socialLinks)");
    }

    const footer = await Footer.findOne({ isActive: true });

    if (!footer) {
      throw new CustomError.NotFoundError("Footer not found");
    }

    if (type === 'footerMenu') {
      footer.footerMenu = footer.footerMenu.filter(item => item._id.toString() !== itemId);
    } else if (type === 'socialLinks') {
      footer.socialLinks = footer.socialLinks.filter(item => item._id.toString() !== itemId);
    } else {
      throw new CustomError.BadRequestError("Type must be footerMenu or socialLinks");
    }

    await footer.save();
    
    res.status(StatusCodes.OK).json({ footer });
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
      throw new CustomError.BadRequestError("Please provide items array and type (footerMenu or socialLinks)");
    }

    const footer = await Footer.findOne({ isActive: true });

    if (!footer) {
      throw new CustomError.NotFoundError("Footer not found");
    }

    // items dizisi [{id: "id1", order: 0}, {id: "id2", order: 1}] şeklinde olmalı
    if (type === 'footerMenu') {
      // Yeni sıralama bilgisini map ile işliyoruz
      items.forEach(item => {
        const menuItem = footer.footerMenu.find(mi => mi._id.toString() === item.id);
        if (menuItem) {
          menuItem.order = item.order;
        }
      });
      
      // Sıralamayı güncelliyoruz
      footer.footerMenu.sort((a, b) => a.order - b.order);
    } else if (type === 'socialLinks') {
      items.forEach(item => {
        const socialLink = footer.socialLinks.find(sl => sl._id.toString() === item.id);
        if (socialLink) {
          socialLink.order = item.order;
        }
      });
      
      footer.socialLinks.sort((a, b) => a.order - b.order);
    } else {
      throw new CustomError.BadRequestError("Type must be footerMenu or socialLinks");
    }

    await footer.save();
    
    res.status(StatusCodes.OK).json({ footer });
  } catch (error) {
    console.error("reorderMenuItems error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Menü öğeleri yeniden sıralanırken bir hata oluştu",
      error: error.message 
    });
  }
};

module.exports = {
  getFooter,
  updateFooter,
  addMenuItem,
  removeMenuItem,
  reorderMenuItems
}; 