const Notification = require("../models/notification");

/**
 * GET ALL NOTIFICATIONS FOR LOGGED IN USER
 */
const getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);

        res.status(200).json({
            success: true,
            notifications,
        });
    } catch (error) {
        console.error("❌ Erreur get notifications:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur",
            error: error.message,
        });
    }
};

/**
 * MARK NOTIFICATION AS READ
 */
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findByIdAndUpdate(id, { isRead: true });

        res.status(200).json({
            success: true,
            message: "Notification marquée comme lue",
        });
    } catch (error) {
        console.error("❌ Erreur mark as read:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur",
        });
    }
};

/**
 * DELETE ALL NOTIFICATIONS
 */
const deleteAllNotifications = async (req, res) => {
    try {
        await Notification.deleteMany({ recipient: req.user._id });
        res.status(200).json({
            success: true,
            message: "Toutes les notifications ont été supprimées",
        });
    } catch (error) {
        console.error("❌ Erreur delete notifications:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur",
        });
    }
};

module.exports = {
    getMyNotifications,
    markAsRead,
    deleteAllNotifications,
};
