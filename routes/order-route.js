const express = require('express');
const {
  createOrder,
  getOrderById,
  getAllOrders,
  confirmReceipt,
} = require('../controller/order-controller');
const { authMiddleware } = require('../middleware/auth-middleware');

const router = express.Router();

// Créer une nouvelle commande
router.post('/', createOrder);

// Récupérer toutes les commandes (avec filtres optionnels)
router.get('/', getAllOrders);

// Récupérer les détails d'une commande par ID
router.get('/:id', getOrderById);

// Confirmer la réception par le client
router.patch('/:id/confirm', authMiddleware, confirmReceipt);

module.exports = router;