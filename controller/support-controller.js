const Support = require("../models/support");
const User = require("../models/user");

/**
 * POST /api/support/ticket
 * @description Create a new support ticket
 * @header {string} Authorization - Bearer token (required)
 * @body {string} subject - Ticket subject
 * @body {string} email - User email
 * @body {string} category - Category (technical/billing/delivery/account/other)
 * @body {string} message - Detailed message
 */
const createTicket = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { subject, email, category, message } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!subject || !email || !category || !message) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs requis doivent être remplis",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    const ticket = await Support.create({
      userId,
      subject,
      email,
      category,
      message,
      status: "open",
      createdAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Ticket créé avec succès",
      ticket,
    });
  } catch (error) {
    console.error("❌ [Create Ticket] Error:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * GET /api/support/tickets
 * @description Get user's support tickets
 * @header {string} Authorization - Bearer token (required)
 * @query {string} [status] - Filter by status (open/closed)
 * @query {number} [limit] - Number of tickets to return (default: 10)
 * @query {number} [offset] - Pagination offset (default: 0)
 */
const getTickets = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { status, limit = 10, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const query = { userId };

    if (status) {
      query.status = status;
    }

    const tickets = await Support.find(query)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .sort({ createdAt: -1 });

    const total = await Support.countDocuments(query);

    res.status(200).json({
      success: true,
      tickets,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("❌ [Get Tickets] Error:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * GET /api/support/tickets/:id
 * @description Get a specific support ticket
 * @header {string} Authorization - Bearer token (required)
 * @param {string} id - Ticket ID
 */
const getTicketById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const ticket = await Support.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket non trouvé",
      });
    }

    // Verify ownership
    if (ticket.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas accès à ce ticket",
      });
    }

    res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error("❌ [Get Ticket By ID] Error:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * PUT /api/support/tickets/:id
 * @description Update support ticket
 * @header {string} Authorization - Bearer token (required)
 * @param {string} id - Ticket ID
 * @body {string} [status] - New status (open/in-progress/closed)
 * @body {string} [response] - Admin response
 */
const updateTicket = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { status, response } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const ticket = await Support.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket non trouvé",
      });
    }

    // Verify ownership or admin role
    const user = await User.findById(userId);
    if (ticket.userId.toString() !== userId && user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas accès à ce ticket",
      });
    }

    if (status) ticket.status = status;
    if (response) {
      if (!ticket.responses) ticket.responses = [];
      ticket.responses.push({
        by: userId,
        message: response,
        createdAt: new Date(),
      });
    }

    await ticket.save();

    res.status(200).json({
      success: true,
      message: "Ticket mis à jour avec succès",
      ticket,
    });
  } catch (error) {
    console.error("❌ [Update Ticket] Error:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
};
