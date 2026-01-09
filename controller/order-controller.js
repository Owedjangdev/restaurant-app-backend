const Order = require('../models/order');
const Notification = require('../models/notification');
const User = require('../models/user');

const createOrder = async (req, res) => {
  try {
    const {
      description,
      deliveryAddress,
      receiverPhone,
      instructions,
      deliveryLocation, // On attend { lat, lng } ou [lng, lat]
    } = req.body;

    if (!description || !deliveryAddress || !receiverPhone || !deliveryLocation) {
      return res.status(400).json({ message: 'Champs requis manquants' });
    }

    // 💡 Formatage pour GeoJSON (Mongoose attend [longitude, latitude])
    let coordinates;
    if (deliveryLocation.coordinates) {
      // Format GeoJSON depuis le frontend
      coordinates = deliveryLocation.coordinates;
    } else if (deliveryLocation.lat && deliveryLocation.lng) {
      // Format lat/lng depuis Postman
      coordinates = [deliveryLocation.lng, deliveryLocation.lat];
    } else {
      return res.status(400).json({ message: 'Format de localisation invalide' });
    }

    const formattedLocation = {
      type: 'Point',
      coordinates
    };

    // Generate a random 6-digit delivery code
    const deliveryCode = Math.floor(100000 + Math.random() * 900000).toString();

    const order = await Order.create({
      user: req.user?.id || null,
      description,
      deliveryAddress,
      receiverPhone,
      instructions,
      deliveryLocation: formattedLocation,
      status: 'PENDING',
      deliveryCode,
    });

    // Populate user info for notification
    await order.populate('user', 'fullName email phone');

    // 🔔 Real-time notification logic
    const io = req.app.get('io');
    const message = `Nouvelle commande de ${order.user?.fullName || 'un client'}`;

    // Save notifications for all admins
    const admins = await User.find({ role: 'admin' });
    const notificationPromises = admins.map(admin => Notification.create({
      recipient: admin._id,
      sender: req.user?._id,
      type: 'ORDER_CREATED',
      message: message,
      relatedId: order._id
    }));
    await Promise.all(notificationPromises);

    if (io) {
      io.to('admin').emit('new-order', {
        orderId: order._id,
        clientName: order.user?.fullName || 'Client inconnu',
        clientPhone: order.user?.phone || receiverPhone,
        deliveryAddress: order.deliveryAddress,
        description: order.description,
        createdAt: order.createdAt,
        message: message
      });
      console.log('✅ Notification envoyée et sauvegardée pour les admins:', order._id);
    }

    return res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({
      message: 'Erreur lors de la création',
      error: error.message
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande non trouvée' });
    return res.status(200).json({ order });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};

    if (status) {
      if (status === 'active') {
        query.status = { $in: ['PENDING', 'ASSIGNED', 'IN_DELIVERY'] };
      } else {
        // Convertir les statuts minuscules en majuscules
        const statusMap = {
          'pending': 'PENDING',
          'assigned': 'ASSIGNED',
          'in_delivery': 'IN_DELIVERY',
          'delivered': 'DELIVERED'
        };
        const mappedStatus = statusMap[status.toLowerCase()] || status.toUpperCase();
        query.status = mappedStatus;
      }
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate('livreur', 'fullName')
      .lean();

    return res.status(200).json({ orders });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * CONFIRM RECEIPT (Client confirme avoir reçu la commande)
 */
const confirmReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;

    // Seul le propriétaire peut confirmer la réception
    const order = await Order.findOne({ _id: id, user: userId });

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée ou non autorisée' });
    }

    if (order.status !== 'DELIVERED') {
      return res.status(400).json({ message: 'La commande doit être marquée comme livrée pour être confirmée' });
    }

    order.status = 'RECEIVED';
    await order.save();

    // 🔔 Notifications
    const io = req.app.get('io');
    const message = `Le client a confirmé la réception de la commande ${order._id.substring(0, 8)}`;

    // Notification pour le livreur
    if (order.livreur) {
      await Notification.create({
        recipient: order.livreur,
        sender: userId,
        type: 'ORDER_RECEIVED',
        message: message,
        relatedId: order._id
      });

      if (io) {
        io.to(order.livreur.toString()).emit('order-received-confirmation', {
          orderId: order._id,
          message: message
        });
      }
    }

    // Notification pour les admins
    const admins = await User.find({ role: 'admin' });
    const adminNotifPromises = admins.map(admin => Notification.create({
      recipient: admin._id,
      sender: userId,
      type: 'ORDER_RECEIVED',
      message: message,
      relatedId: order._id
    }));
    await Promise.all(adminNotifPromises);

    if (io) {
      io.to('admin').emit('order-received-admin', {
        orderId: order._id,
        message: message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Réception confirmée avec succès',
      order
    });
  } catch (error) {
    console.error('Error confirming receipt:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

module.exports = { createOrder, getOrderById, getAllOrders, confirmReceipt };