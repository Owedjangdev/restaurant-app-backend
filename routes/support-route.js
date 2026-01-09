const express = require("express");
const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
} = require("../controller/support-controller");
const { authMiddleware } = require("../middleware/auth-middleware");

const router = express.Router();

// ============================================================
// PROTECTED ROUTES (Require Authentication)
// ============================================================

/**
 * @route POST /ticket
 * @description Create a new support ticket
 * @header {string} Authorization - Bearer token (required)
 * @body {string} subject - Ticket subject
 * @body {string} email - User email
 * @body {string} category - Category (technical/billing/delivery/account/other)
 * @body {string} message - Detailed message
 * @returns {object} 201 - Ticket created successfully
 * @returns {object} 400 - Validation error
 * @returns {object} 401 - Unauthorized
 */
router.post("/ticket", authMiddleware, createTicket);

/**
 * @route GET /tickets
 * @description Get user's support tickets
 * @header {string} Authorization - Bearer token (required)
 * @query {string} [status] - Filter by status (open/closed/in-progress)
 * @query {number} [limit] - Number of tickets to return (default: 10)
 * @query {number} [offset] - Pagination offset (default: 0)
 * @returns {object} 200 - Array of tickets with pagination
 * @returns {object} 401 - Unauthorized
 */
router.get("/tickets", authMiddleware, getTickets);

/**
 * @route GET /tickets/:id
 * @description Get a specific support ticket
 * @header {string} Authorization - Bearer token (required)
 * @param {string} id - Ticket ID
 * @returns {object} 200 - Ticket details
 * @returns {object} 401 - Unauthorized
 * @returns {object} 403 - Forbidden (not ticket owner)
 * @returns {object} 404 - Ticket not found
 */
router.get("/tickets/:id", authMiddleware, getTicketById);

/**
 * @route PUT /tickets/:id
 * @description Update support ticket (add response or change status)
 * @header {string} Authorization - Bearer token (required)
 * @param {string} id - Ticket ID
 * @body {string} [status] - New status (open/in-progress/closed)
 * @body {string} [response] - Admin or user response message
 * @returns {object} 200 - Ticket updated successfully
 * @returns {object} 401 - Unauthorized
 * @returns {object} 403 - Forbidden (not ticket owner or admin)
 * @returns {object} 404 - Ticket not found
 */
router.put("/tickets/:id", authMiddleware, updateTicket);

module.exports = router;
