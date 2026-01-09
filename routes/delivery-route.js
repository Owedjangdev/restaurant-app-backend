const express = require("express");
const {
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
} = require("../controller/delivery-controller");
const { authMiddleware } = require("../middleware/auth-middleware");

const router = express.Router();

// ============================================================
// INSCRIPTION LIVREUR
// ============================================================

/**
 * @route POST /register
 * @description Inscription d'un nouveau livreur
 * @description Crée un profil livreur en attente de vérification admin
 * @body {string} fullName - Nom complet du livreur
 * @body {string} email - Email professionnel
 * @body {string} password - Mot de passe sécurisé (8+ caractères)
 * @body {string} phone - Numéro de téléphone
 * @body {string} vehicleType - Type de véhicule (bike/scooter/moto/car)
 * @body {string} licensePlate - Immatriculation du véhicule
 * @returns {object} 201 - Inscription réussie, en attente de vérification
 * @returns {object} 400 - Email/téléphone déjà utilisé ou données invalides
 */
router.post("/register", registerDelivery);

// ============================================================
// ESPACE LIVREUR (Authentification requise)
// ============================================================

/**
 * @route GET /profile
 * @description Récupérer le profil professionnel du livreur
 * @header {string} Authorization - Bearer token (requis)
 * @returns {object} 200 - Profil avec infos personnelles, véhicule et statut
 * @returns {object} 401 - Token invalide ou expiré
 * @returns {object} 404 - Profil livreur non trouvé
 */
router.get("/profile", authMiddleware, getDeliveryProfile);

/**
 * @route PUT /profile
 * @description Modifier les informations professionnelles du livreur
 * @header {string} Authorization - Bearer token (requis)
 * @body {string} [fullName] - Nom complet
 * @body {string} [phone] - Téléphone de contact
 * @body {string} [vehicleType] - Type de véhicule utilisé
 * @body {string} [status] - Statut de disponibilité (available/busy/offline)
 * @returns {object} 200 - Profil mis à jour avec succès
 * @returns {object} 400 - Données invalides
 * @returns {object} 401 - Non authentifié
 */
router.put("/profile", authMiddleware, updateDeliveryProfile);

/**
 * @route GET /available-orders
 * @description Lister les commandes disponibles pour ce livreur
 * @header {string} Authorization - Bearer token (requis)
 * @query {string} [distance] - Filtrer par distance (km) - optional
 * @query {number} [limit] - Nombre de commandes à retourner (défaut: 10)
 * @query {number} [offset] - Pagination (défaut: 0)
 * @returns {object} 200 - Liste des commandes avec détails client et adresse
 * @returns {object} 401 - Non authentifié
 * @description Les commandes sont triées par proximité et urgence
 */
router.get("/available-orders", authMiddleware, getAvailableOrders);

/**
 * @route POST /accept-order/:orderId
 * @description Accepter une commande disponible
 * @header {string} Authorization - Bearer token (requis)
 * @param {string} orderId - ID de la commande à prendre en charge
 * @returns {object} 200 - Commande acceptée, estimation du temps indiquée
 * @returns {object} 400 - Commande déjà acceptée ou indisponible
 * @returns {object} 401 - Non authentifié
 * @returns {object} 404 - Commande non trouvée
 * @description Envoie automatiquement une notification au client
 */
router.post("/accept-order/:orderId", authMiddleware, acceptOrder);

/**
 * @route GET /my-deliveries
 * @description Consulter l'historique des livraisons du livreur
 * @header {string} Authorization - Bearer token (requis)
 * @query {string} [status] - Filtrer par statut (pending/in-progress/completed/cancelled)
 * @query {number} [limit] - Nombre de livraisons à retourner (défaut: 10)
 * @query {number} [offset] - Pagination (défaut: 0)
 * @returns {object} 200 - Liste complète avec statistiques (distance, gain, notes)
 * @returns {object} 401 - Non authentifié
 * @description Inclut les notes et commentaires clients
 */
router.get("/my-deliveries", authMiddleware, getMyDeliveries);

/**
 * @route PUT /update-location/:orderId
 * @description Mettre à jour la localisation en direct pendant la livraison
 * @header {string} Authorization - Bearer token (requis)
 * @param {string} orderId - ID de la livraison en cours
 * @body {number} latitude - Latitude actuelle (GPS)
 * @body {number} longitude - Longitude actuelle (GPS)
 * @body {string} [status] - Statut de livraison (IN_DELIVERY/DELIVERED)
 * @returns {object} 200 - Position mise à jour, notification client envoyée
 * @returns {object} 400 - Coordonnées invalides ou livraison terminée
 * @returns {object} 401 - Non authentifié
 * @returns {object} 404 - Livraison non trouvée
 * @description Met à jour la carte en temps réel pour le client
 */
router.put("/update-location/:orderId", authMiddleware, updateDeliveryLocation);

// ============================================================
// HISTORIQUE ET STATISTIQUES
// ============================================================

/**
 * @route GET /history
 * @description Consulter l'historique complet des livraisons terminées
 * @header {string} Authorization - Bearer token (requis)
 * @query {string} [status] - Filtrer par statut (défaut: DELIVERED)
 * @query {number} [limit] - Nombre de livraisons (défaut: 50)
 * @query {number} [offset] - Pagination (défaut: 0)
 * @returns {object} 200 - Liste des livraisons terminées avec statistiques
 * @returns {object} 401 - Non authentifié
 */
router.get("/history", authMiddleware, getDeliveryHistory);

/**
 * @route GET /stats
 * @description Récupérer les statistiques de performance du livreur
 * @header {string} Authorization - Bearer token (requis)
 * @returns {object} 200 - Stats: total, complétées, actives, mensuelles, note
 * @returns {object} 401 - Non authentifié
 */
router.get("/stats", authMiddleware, getDeliveryStats);

/**
 * @route PUT /complete/:orderId
 * @description Marquer une livraison comme complétée
 * @header {string} Authorization - Bearer token (requis)
 * @param {string} orderId - ID de la livraison
 * @body {string} [proof] - Preuves de livraison (optionnel)
 * @returns {object} 200 - Livraison marquée comme complétée
 * @returns {object} 404 - Livraison non trouvée
 * @returns {object} 401 - Non authentifié
 */
router.put("/complete/:orderId", authMiddleware, completeDelivery);

module.exports = router;
