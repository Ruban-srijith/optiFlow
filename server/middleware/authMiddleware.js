const jwt = require('jsonwebtoken');

/**
 * Middleware: verify JWT token from Authorization header.
 * Attaches decoded user payload to req.user (and req.conductor for backward compatibility).
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'optiflow_jwt_secret_dev_key');
    req.user = decoded;
    req.conductor = decoded; // backward compatibility
    req.admin = decoded;     // backward compatibility
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Middleware: verify specific role(s)
 * @param {Array<string>|string} allowedRoles
 */
function verifyRole(allowedRoles) {
  const rolesList = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Super admin overrides all role checks
    if (req.user.role === 'superadmin' || rolesList.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ 
      error: `Forbidden. Required role: ${rolesList.join(' or ')}. Your role: ${req.user.role}` 
    });
  };
}

module.exports = { 
  verifyToken, 
  verifyRole,
};
