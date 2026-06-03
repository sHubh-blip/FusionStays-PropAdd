const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'Access denied. No role provided.' });
    }

    const hasRole = allowedRoles.some(role => role.toLowerCase() === req.user.role.toLowerCase());
    
    if (!hasRole) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};

module.exports = requireRole;
