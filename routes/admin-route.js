const express = require("express");
const {
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
} = require("../controller/admin-controller");
const { authMiddleware } = require("../middleware/auth-middleware");

const router = express.Router();

// ============================================================
// PROTECTION ADMIN - Authentification et vérification du rôle
// ============================================================
router.use(authMiddleware);

// ============================================================
// PROFIL ADMINISTRATEUR
// ============================================================

/**
 * @route GET /profile
 * @description Récupérer le profil administrateur
 * @header {string} Authorization - Bearer token (admin requis)
 * @returns {object} 200 - Données du profil admin (ID, nom, email, permissions)
 * @returns {object} 401 - Token invalide ou expiré
 * @returns {object} 403 - Accès admin requis
 */
router.get("/profile", getAdminProfile);

/**
 * @route PUT /profile
 * @description Modifier les informations d'un administrateur
 * @header {string} Authorization - Bearer token (admin requis)
 * @body {string} [fullName] - Nom complet
 * @body {string} [phone] - Téléphone
 * @body {string} [address] - Adresse
 * @body {string} [city] - Ville
 * @body {string} [postalCode] - Code postal
 * @returns {object} 200 - Profil mis à jour
 * @returns {object} 400 - Données invalides
 * @returns {object} 403 - Accès admin requis
 */
router.put("/profile", updateAdminProfile);

// ============================================================
// GESTION DES UTILISATEURS (Validation & Modération)
// ============================================================

/**
 * @route GET /users
 * @description Lister tous les utilisateurs avec filtrage
 * @header {string} Authorization - Bearer token (admin requis)
 * @query {string} [role] - Filtrer par rôle (client/livreur/admin)
 * @query {boolean} [isVerified] - Filtrer par statut (true/false)
 * @returns {object} 200 - Liste complète avec email, téléphone, statut
 * @returns {object} 403 - Accès admin requis
 * @description Les données sensibles sont exclues (mots de passe)
 */
router.get("/users", getAllUsers);

/**
 * @route POST /users
 * @description Créer un utilisateur (client/admin)
 */
router.post("/users", createUser);

/**
 * @route PATCH /users/:userId
 * @description Modifier un utilisateur
 */
router.patch("/users/:userId", updateUser);

/**
 * @route PATCH /users/:userId/status
 * @description Activer/Désactiver un utilisateur
 */
router.patch("/users/:userId/status", toggleUserStatus);

/**
 * @route DELETE /users/:userId
 * @description Supprimer un utilisateur
 */
router.delete("/users/:userId", deleteUser);

// ============================================================
// GESTION DES CANDIDATURES LIVREURS
// ============================================================

/**
 * @route GET /deliveries/applications
 * @description Consulter les candidatures de livreurs en attente
 * @header {string} Authorization - Bearer token (admin requis)
 * @returns {object} 200 - Liste des livreurs non vérifiés avec leurs infos
 * @returns {object} 403 - Accès admin requis
 * @description Affiche les documents d'inscription pour vérification
 */
router.get("/deliveries/applications", getDeliveryApplications);

/**
 * @route PUT /deliveries/:userId/verify
 * @description Approuver et activer un livreur
 * @header {string} Authorization - Bearer token (admin requis)
 * @param {string} userId - ID du livreur à approuver
 * @returns {object} 200 - Livreur activé et notification email envoyée
 * @returns {object} 404 - Livreur non trouvé
 * @returns {object} 403 - Accès admin requis
 * @description Email de confirmation est automatiquement envoyé
 */
router.put("/deliveries/:userId/verify", verifyDelivery);

/**
 * @route DELETE /deliveries/:userId/reject
 * @description Rejeter une candidature de livreur
 * @header {string} Authorization - Bearer token (admin requis)
 * @param {string} userId - ID du livreur à rejeter
 * @body {string} reason - Motif du rejet (optionnel)
 * @returns {object} 200 - Candidature rejetée
 * @returns {object} 404 - Livreur non trouvé
 * @returns {object} 403 - Accès admin requis
 * @description Email de notification est envoyé au livreur
 */
router.delete("/deliveries/:userId/reject", rejectDelivery);

/**
 * @route POST /deliveries/create
 * @description Créer un nouveau livreur directement (sans candidature)
 * @header {string} Authorization - Bearer token (admin requis)
 * @body {string} fullName - Nom complet du livreur
 * @body {string} email - Email du livreur
 * @body {string} phone - Téléphone du livreur
 * @body {string} password - Mot de passe initial
 * @body {string} vehicleType - Type de véhicule (moto/velo/auto)
 * @body {string} [licensePlate] - Plaque d'immatriculation
 * @body {string} [address] - Adresse
 * @body {string} [bankAccount] - Compte bancaire
 * @returns {object} 200 - Livreur créé et notification envoyée
 * @returns {object} 400 - Données invalides ou email/téléphone déjà utilisé
 * @returns {object} 403 - Accès admin requis
 * @description Le livreur est automatiquement vérifié et peut commencer à travailler
 */
router.post("/deliveries/create", createDeliveryPerson);



// ============================================================
// GESTION DES COMMANDES (Assignation & Suivi)
// ============================================================

/**
 * @route GET /orders
 * @description Consulter toutes les commandes du système
 * @header {string} Authorization - Bearer token (admin requis)
 * @query {string} [status] - Filtrer par statut (pending/assigned/completed/cancelled)
 * @query {string} [clientId] - Filtrer par client
 * @query {number} [limit] - Nombre de résultats (défaut: 50)
 * @returns {object} 200 - Liste complète avec détails (client, livreur, adresse)
 * @returns {object} 403 - Accès admin requis
 * @description Permet le suivi de toutes les opérations
 */
router.get("/orders", getAllOrders);

/**
 * @route POST /orders/:orderId/assign
 * @description Assigner manuellement une commande à un livreur
 * @header {string} Authorization - Bearer token (admin requis)
 * @param {string} orderId - ID de la commande
 * @body {string} deliveryId - ID du livreur destinataire
 * @returns {object} 200 - Commande assignée, notifications envoyées
 * @returns {object} 400 - Livreur indisponible
 * @returns {object} 404 - Commande ou livreur non trouvé
 * @returns {object} 403 - Accès admin requis
 * @description Notifie le livreur et le client immédiatement
 */
router.post("/orders/:orderId/assign", assignOrderToDelivery);

// ============================================================
// TABLEAU DE BORD ADMINISTRATEUR
// ============================================================

/**
 * @route GET /stats
 * @description Récupérer les statistiques globales du système
 * @header {string} Authorization - Bearer token (admin requis)
 * @returns {object} 200 - KPI: utilisateurs, commandes, livreurs, revenus, etc.
 * @returns {object} 403 - Accès admin requis
 * @description Inclut tendances journalières, graphiques, performances
 */
router.get("/stats", getDashboardStats);

module.exports = router;
