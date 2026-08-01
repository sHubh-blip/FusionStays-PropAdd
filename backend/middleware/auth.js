const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_dev_only');
    req.user = decoded; // add user payload to request

    const isResetPasswordPath = req.originalUrl.endsWith('/reset-password') || req.path.endsWith('/reset-password');
    if (req.user.mustResetPassword && !isResetPasswordPath) {
      return res.status(403).json({ message: 'Password reset required.', mustResetPassword: true });
    }

    next();
  } catch (ex) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

module.exports = requireAuth;
