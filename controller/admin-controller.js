const User = require("../models/user");
const Order = require("../models/order");
const Notification = require("../models/notification");

/**
 * GET ALL USERS
 */
const getAllUsers = async (req, res) => {
  try {
    const { role, isVerified } = req.query;
    const query = {};

    if (role) query.role = role;
    if (isVerified !== undefined) {
      query.isVerified = isVerified === 'true' || isVerified === true;
    }

    const users = await User.find(query)
      .select("-password -resetPasswordToken -resetPasswordExpiry")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur get all users:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * GET DELIVERY APPLICATIONS (Livreurs en attente de vérification)
 */
const getDeliveryApplications = async (req, res) => {
  try {
    const users = await User.find({ role: 'livreur', isVerified: false })
      .select("-password -resetPasswordToken -resetPasswordExpiry")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur get delivery applications:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * VERIFY/APPROVE DELIVERY
 */
const verifyDelivery = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { isVerified: true },
      { new: true }
    ).select("-password -resetPasswordToken -resetPasswordExpiry");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    console.log("✅ [Backend] Livreur vérifiée:", user._id);

    res.status(200).json({
      success: true,
      message: "Livreur vérifiée avec succès",
      user,
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur verify delivery:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * REJECT DELIVERY APPLICATION
 */
const rejectDelivery = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    console.log("✅ [Backend] Application livreur rejetée:", user._id);

    res.status(200).json({
      success: true,
      message: "Application rejetée",
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur reject delivery:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * GET ALL ORDERS (Admin view)
 */
const getAllOrders = async (req, res) => {
  try {
    const { status, livreur } = req.query;
    const query = {};

    if (status) query.status = status;
    if (livreur) query.livreur = livreur;

    const orders = await Order.find(query)
      .populate('user', 'fullName email phone')
      .populate('livreur', 'fullName phone vehicleType')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(" Erreur get all orders:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * ASSIGN ORDER TO DELIVERY
 */
const assignOrderToDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { livreurId } = req.body;

    if (!livreurId) {
      return res.status(400).json({
        success: false,
        message: "ID du livreur requis",
      });
    }

    // Vérifier que le livreur existe et est vérifiée
    const livreur = await User.findById(livreurId);
    if (!livreur || livreur.role !== 'livreur' || !livreur.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Livreur non trouvée ou non vérifiée",
      });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        livreur: livreurId,
        status: 'ASSIGNED',
        assignedAt: new Date(),
      },
      { new: true }
    )
      .populate('livreur', 'fullName phone')
      .populate('user', 'fullName email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Commande non trouvée",
      });
    }

    // 🔔 Real-time notifications logic
    const io = req.app.get('io');
    const livreurMessage = `Nouvelle commande assignée`;
    const clientMessage = `Votre commande est en cours - Un livreur a été assigné`;

    // Save notifications to DB
    await Notification.create({
      recipient: livreurId,
      sender: req.user?._id,
      type: 'ORDER_ASSIGNED',
      message: livreurMessage,
      relatedId: order._id
    });

    if (order.user) {
      await Notification.create({
        recipient: order.user._id,
        sender: req.user?._id,
        type: 'ORDER_STATUS_UPDATE',
        message: clientMessage,
        relatedId: order._id
      });
    }

    if (io) {
      // Notify the delivery person
      io.to(livreurId.toString()).emit('order-assigned', {
        orderId: order._id,
        clientName: order.user?.fullName,
        deliveryAddress: order.deliveryAddress,
        receiverPhone: order.receiverPhone,
        description: order.description,
        deliveryLocation: order.deliveryLocation,
        message: livreurMessage
      });
      console.log('✅ Notification envoyée et sauvegardée pour le livreur:', livreurId);

      // Notify the client
      if (order.user) {
        io.to(order.user._id.toString()).emit('order-status-update', {
          orderId: order._id,
          status: 'ASSIGNED',
          livreurName: order.livreur?.fullName,
          livreurPhone: order.livreur?.phone,
          message: clientMessage
        });
        console.log('✅ Notification envoyée et sauvegardée pour le client:', order.user._id);
      }
    }

    res.status(200).json({
      success: true,
      message: "Commande assignée avec succès",
      order,
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur assign order:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * GET DASHBOARD STATS
 */
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalClients = await User.countDocuments({ role: 'client' });
    const totalDelivery = await User.countDocuments({ role: 'livreur' });
    const verifiedDelivery = await User.countDocuments({ role: 'livreur', isVerified: true });
    const pendingDelivery = await User.countDocuments({ role: 'livreur', isVerified: false });

    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'PENDING' });
    const assignedOrders = await Order.countDocuments({ status: 'ASSIGNED' });
    const inDeliveryOrders = await Order.countDocuments({ status: 'IN_DELIVERY' });
    const deliveredOrders = await Order.countDocuments({ status: 'DELIVERED' });

    res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          clients: totalClients,
          delivery: totalDelivery,
          verifiedDelivery,
          pendingDelivery,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          assigned: assignedOrders,
          inDelivery: inDeliveryOrders,
          delivered: deliveredOrders,
        },
      },
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur get stats:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * DEACTIVATE USER
 */
const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { active } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: active },
      { new: true }
    ).select("-password -resetPasswordToken -resetPasswordExpiry");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    console.log(`✅ [Backend] Statut utilisateur ${active ? 'activé' : 'désactivé'}:`, user._id);

    res.status(200).json({
      success: true,
      message: `Utilisateur ${active ? 'activé' : 'désactivé'}`,
      user,
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur toggle user status:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/profile
 * @description Get admin profile
 * @header {string} Authorization - Bearer token (required)
 */
const getAdminProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(userId).select("-password");

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Accès admin requis",
      });
    }

    res.status(200).json({
      success: true,
      profile: user,
    });
  } catch (error) {
    console.error("❌ [Admin Profile] Error:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * PUT /api/admin/profile
 * @description Update admin profile
 * @header {string} Authorization - Bearer token (required)
 * @body {string} [fullName] - Updated full name
 * @body {string} [phone] - Updated phone number
 * @body {string} [address] - Updated address
 * @body {string} [city] - Updated city
 * @body {string} [postalCode] - Updated postal code
 */
const updateAdminProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { fullName, phone, address, city, postalCode } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Accès admin requis",
      });
    }

    const updateData = {};

    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (city) updateData.city = city;
    if (postalCode) updateData.postalCode = postalCode;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.status(200).json({
      success: true,
      message: "Profil mis à jour avec succès",
      profile: updatedUser,
    });
  } catch (error) {
    console.error("❌ [Update Admin Profile] Error:", error);
    res.status(400).json({
      success: false,
      message: "Erreur lors de la mise à jour",
      error: error.message,
    });
  }
};

/**
 * CREATE DELIVERY PERSON (Admin only)
 */
const createDeliveryPerson = async (req, res) => {
  try {
    const { fullName, phone, email, address, password, vehicleType, licensePlate, bankAccount } = req.body;

    if (!fullName || !phone || !email || !password || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs requis doivent être remplis (fullName, phone, email, password, vehicleType)",
      });
    }

    // Vérifier si l'email ou le téléphone existe déjà
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email ou numéro de téléphone déjà utilisé",
      });
    }

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    const deliveryPerson = await User.create({
      fullName,
      phone,
      email,
      address: address || '',
      password: hashedPassword,
      role: "livreur",
      vehicleType,
      licensePlate: licensePlate || '',
      bankAccount: bankAccount || '',
      isVerified: true, // Créé par admin = automatiquement vérifié
    });

    console.log("✅ [Backend] Livreur créé par admin:", deliveryPerson._id);

    // 🔔 Real-time notification logic
    const io = req.app.get('io');
    const message = `Votre compte livreur a été créé par l'administrateur`;

    // Save notification to DB
    await Notification.create({
      recipient: deliveryPerson._id,
      sender: req.user?._id,
      type: 'ACCOUNT_CREATED',
      message: message,
      relatedId: deliveryPerson._id
    });

    if (io) {
      io.to(deliveryPerson._id.toString()).emit('account-created', {
        userId: deliveryPerson._id,
        fullName: deliveryPerson.fullName,
        email: deliveryPerson.email,
        message: message
      });
      console.log('✅ Notification envoyée et sauvegardée pour le nouveau livreur:', deliveryPerson._id);
    }

    // Envoyer un email de bienvenue
    const { sendDeliveryWelcomeEmail } = require("../services/emailService");
    await sendDeliveryWelcomeEmail(email, deliveryPerson);

    res.status(201).json({
      success: true,
      message: "Livreur créé avec succès",
      user: {
        id: deliveryPerson._id,
        fullName: deliveryPerson.fullName,
        email: deliveryPerson.email,
        phone: deliveryPerson.phone,
        role: deliveryPerson.role,
        vehicleType: deliveryPerson.vehicleType,
        isVerified: deliveryPerson.isVerified,
      },
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur create delivery person:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * CREATE USER (Generic for clients/admins)
 */
const createUser = async (req, res) => {
  try {
    const { fullName, phone, email, address, password, role } = req.body;

    if (!fullName || !phone || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs requis doivent être remplis",
      });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email ou numéro de téléphone déjà utilisé",
      });
    }

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      phone,
      email,
      address,
      password: hashedPassword,
      role,
      isVerified: true,
    });

    res.status(201).json({
      success: true,
      message: "Utilisateur créé avec succès",
      user,
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur create user:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * UPDATE USER
 */
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    // Si on change le mot de passe
    if (updateData.password) {
      const bcrypt = require("bcryptjs");
      updateData.password = await bcrypt.hash(updateData.password, 10);
    } else {
      delete updateData.password;
    }

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true })
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    res.status(200).json({
      success: true,
      message: "Utilisateur mis à jour",
      user,
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur update user:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * DELETE USER
 */
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    console.log("✅ [Backend] Utilisateur supprimé:", user._id);

    res.status(200).json({
      success: true,
      message: "Utilisateur supprimé définitivement",
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur delete user:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  getDeliveryApplications,
  verifyDelivery,
  rejectDelivery,
  getAllOrders,
  assignOrderToDelivery,
  getDashboardStats,
  toggleUserStatus,
  getAdminProfile,
  updateAdminProfile,
  createDeliveryPerson,
  createUser,
  updateUser,
  deleteUser,
};
