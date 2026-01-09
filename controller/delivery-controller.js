const mongoose = require("mongoose");
const User = require("../models/user");
const Order = require("../models/order");
const Notification = require("../models/notification");
const { sendDeliveryWelcomeEmail } = require("../services/emailService");

/**
 * REGISTER DELIVERY PERSON
 */
const registerDelivery = async (req, res) => {
  try {
    console.log("📥 [Backend] Données reçues pour register livreur:", req.body);

    const { fullName, phone, email, address, password, vehicleType, licensePlate } = req.body;

    if (!fullName || !phone || !email || !address || !password || !vehicleType || !licensePlate) {
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

    const hashedPassword = await require("bcryptjs").hash(password, 10);

    const user = await User.create({
      fullName,
      phone,
      email,
      address,
      password: hashedPassword,
      role: "livreur",
      vehicleType,
      licensePlate,
      isVerified: false, // En attente de vérification par admin
    });

    console.log("✅ [Backend] Livreur créé:", user._id);

    // Envoyer un email de bienvenue
    await sendDeliveryWelcomeEmail(email, user);

    res.status(201).json({
      success: true,
      message: "Inscription effectuée. Vous recevrez une confirmation une fois vérifiés.",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur register livreur:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * GET DELIVERY PERSON PROFILE
 */
const getDeliveryProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password -resetPasswordToken -resetPasswordExpiry");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur get profile:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * UPDATE DELIVERY PROFILE
 */
const updateDeliveryProfile = async (req, res) => {
  try {
    const { vehicleType, licensePlate, bankAccount } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { vehicleType, licensePlate, bankAccount },
      { new: true, runValidators: true }
    ).select("-password -resetPasswordToken -resetPasswordExpiry");

    res.status(200).json({
      success: true,
      message: "Profil mis à jour",
      user,
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur update profile:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * GET AVAILABLE ORDERS FOR DELIVERY
 */
const getAvailableOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: 'PENDING' })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur get available orders:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * ACCEPT ORDER (Livreur accepte une commande)
 */
const acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        livreur: req.user._id,
        status: 'ASSIGNED',
        assignedAt: new Date(),
      },
      { new: true }
    ).populate('livreur', 'fullName phone');

    res.status(200).json({
      success: true,
      message: "Commande acceptée",
      order,
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur accept order:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * GET MY DELIVERIES (Commandes assignées au livreur)
 */
const getMyDeliveries = async (req, res) => {
  try {
    const { status } = req.query;
    // Conversion explicite en ObjectId pour assurer la correspondance avec MongoDB
    const livreurId = new mongoose.Types.ObjectId(req.user._id);
    const query = { livreur: livreurId };

    if (status) {
      if (status.includes(',')) {
        query.status = { $in: status.split(',').map(s => s.trim()) };
      } else {
        query.status = status;
      }
    }

    console.log("🔍 [Backend] Fetching deliveries for livreur:", req.user._id, "Query:", query);

    const orders = await Order.find(query)
      .populate('user', 'fullName phone email avatar')
      .sort({ createdAt: -1 })
      .lean();

    console.log("📦 [Backend] Orders found:", orders.length);

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur get my deliveries:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * UPDATE DELIVERY LOCATION
 */
const updateDeliveryLocation = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { latitude, longitude, status } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude et longitude requises",
      });
    }

    const updateData = {
      deliveryLocation: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
    };

    if (status) {
      updateData.status = status;
      if (status === 'IN_DELIVERY') {
        updateData.pickedUpAt = new Date();
      } else if (status === 'DELIVERED') {
        updateData.deliveredAt = new Date();
      }
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      updateData,
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
    if (status) {
      let clientMsg = '';
      if (status === 'IN_DELIVERY') {
        clientMsg = 'Votre commande est en cours de livraison';
      } else if (status === 'DELIVERED') {
        clientMsg = 'Commande validée - Produit livré avec succès';
      }

      const adminMsg = `Commande ${order._id} - Statut: ${status}`;

      // Mark as read or create new? We create new notifications for each status change.
      // Save for client
      if (order.user && clientMsg) {
        await Notification.create({
          recipient: order.user._id,
          sender: req.user._id,
          type: 'ORDER_STATUS_UPDATE',
          message: clientMsg,
          relatedId: order._id
        });
      }

      // Save for all admins
      const admins = await User.find({ role: 'admin' });
      const adminNotifPromises = admins.map(admin => Notification.create({
        recipient: admin._id,
        sender: req.user._id,
        type: 'ORDER_STATUS_UPDATE',
        message: adminMsg,
        relatedId: order._id
      }));
      await Promise.all(adminNotifPromises);

      if (io) {
        // Notify client
        if (order.user && clientMsg) {
          io.to(order.user._id.toString()).emit('order-status-update', {
            orderId: order._id,
            status: order.status,
            livreurName: order.livreur?.fullName,
            message: clientMsg
          });
        }

        // Notify admin
        io.to('admin').emit('order-status-update', {
          orderId: order._id,
          status: order.status,
          clientName: order.user?.fullName,
          livreurName: order.livreur?.fullName,
          message: adminMsg
        });
        console.log('✅ Notifications envoyées et sauvegardées pour le statut:', status);
      }
    }

    res.status(200).json({
      success: true,
      message: "Localisation mise à jour",
      order,
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur update location:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * GET DELIVERY HISTORY (Livraisons terminées du livreur)
 */
const getDeliveryHistory = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const query = {
      livreur: req.user._id,
      status: status || 'DELIVERED',
    };

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'fullName phone email')
      .sort({ deliveredAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    res.status(200).json({
      success: true,
      total,
      orders,
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur get delivery history:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * GET DELIVERY STATISTICS
 */
const getDeliveryStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Compter les livraisons par statut
    const totalDeliveries = await Order.countDocuments({ livreur: userId });
    const completedDeliveries = await Order.countDocuments({
      livreur: userId,
      status: 'DELIVERED',
    });
    const activeDeliveries = await Order.countDocuments({
      livreur: userId,
      status: { $in: ['ASSIGNED', 'IN_DELIVERY'] },
    });

    // Stats mensuelles
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyDeliveries = await Order.countDocuments({
      livreur: userId,
      status: 'DELIVERED',
      deliveredAt: { $gte: startOfMonth },
    });

    // Récupérer la note moyenne
    const user = await User.findById(userId).select('rating');

    res.status(200).json({
      success: true,
      stats: {
        total: totalDeliveries,
        completed: completedDeliveries,
        active: activeDeliveries,
        monthlyCompleted: monthlyDeliveries,
        rating: user?.rating || 5,
      },
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur get delivery stats:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * COMPLETE DELIVERY
 */
const completeDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryCode } = req.body;

    if (!deliveryCode) {
      return res.status(400).json({
        success: false,
        message: "Le code de livraison est requis",
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Livraison non trouvée",
      });
    }

    if (order.deliveryCode !== deliveryCode) {
      return res.status(400).json({
        success: false,
        message: "Code de livraison invalide",
      });
    }

    order.status = 'RECEIVED';
    order.deliveredAt = new Date();
    await order.save();
    await order.populate('user', 'fullName phone email');

    // 🔔 Real-time notifications logic
    const io = req.app.get('io');
    const clientMsg = `Commande validée - Produit livré avec succès`;
    const adminMsg = `Commande livrée avec succès`;

    // Save for client
    if (order.user) {
      await Notification.create({
        recipient: order.user._id,
        sender: req.user?._id,
        type: 'ORDER_STATUS_UPDATE',
        message: clientMsg,
        relatedId: order._id
      });
    }

    // Save for all admins
    const admins = await User.find({ role: 'admin' });
    const adminNotifPromises = admins.map(admin => Notification.create({
      recipient: admin._id,
      sender: req.user?._id,
      type: 'ORDER_DELIVERED',
      message: adminMsg,
      relatedId: order._id
    }));
    await Promise.all(adminNotifPromises);

    if (io) {
      // Notify the client
      if (order.user) {
        io.to(order.user._id.toString()).emit('order-status-update', {
          orderId: order._id,
          status: 'DELIVERED',
          deliveredAt: order.deliveredAt,
          message: clientMsg
        });
        console.log('✅ Notification de livraison envoyée au client:', order.user._id);
      }

      // Notify admin
      io.to('admin').emit('order-delivered', {
        orderId: order._id,
        clientName: order.user?.fullName,
        deliveredAt: order.deliveredAt,
        message: adminMsg
      });
      console.log('✅ Notification de livraison envoyée et sauvegardée pour les admins');
    }

    res.status(200).json({
      success: true,
      message: "Livraison complétée",
      order,
    });
  } catch (error) {
    console.error("❌ [Backend] Erreur complete delivery:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

module.exports = {
  registerDelivery,
  getDeliveryProfile,
  updateDeliveryProfile,
  getAvailableOrders,
  acceptOrder,
  getMyDeliveries,
  updateDeliveryLocation,
  getDeliveryHistory,
  getDeliveryStats,
  completeDelivery,
};
