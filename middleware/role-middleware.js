/**
 * roleMiddleware - vérifie le rôle de l'utilisateur
 */
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas les permissions nécessaires",
      });
    }

    next();
  };
};

module.exports = { roleMiddleware };
