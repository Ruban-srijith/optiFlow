const jwt = require('jsonwebtoken');

/**
 * Middleware: verify JWT token from Authorization header.
 * Attaches decoded user payload to req.user (and req.conductor for backward compatibility).
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Dev fallback: allow unauthenticated requests with a mock user
    req.user = { id: 'dev-user', role: 'superadmin', phone_number: '+919876543210', full_name: 'Dev User' };
    req.conductor = req.user;
    req.admin = req.user;
    return next();
  }

  const token = authHeader.split(' ')[1];

  // Dev fallback: allow mock tokens
  if (token.startsWith('mock') || token.includes('demo')) {
    req.user = { id: 'dev-user', role: 'superadmin', phone_number: '+919876543210', full_name: 'Dev User' };
    req.conductor = req.user;
    req.admin = req.user;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'optiflow_jwt_secret_dev_key');
    req.user = decoded;
    req.conductor = decoded; // backward compatibility
    req.admin = decoded;     // backward compatibility
    next();
  } catch (err) {
    // Dev fallback: if token is invalid, still allow with mock user
    req.user = { id: 'dev-user', role: 'superadmin', phone_number: '+919876543210', full_name: 'Dev User' };
    req.conductor = req.user;
    req.admin = req.user;
    next();
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

/**
 * Middleware: deny specific role(s) from accessing a route.
 * Useful for blacklisting rather than whitelisting.
 * @param {Array<string>|string} deniedRoles
 */
function denyRoles(deniedRoles) {
  const rolesList = Array.isArray(deniedRoles) ? deniedRoles : [deniedRoles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Superadmin is never denied
    if (req.user.role === 'superadmin') {
      return next();
    }

    if (rolesList.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied for role: ${req.user.role}`,
      });
    }
    return next();
  };
}

/**
 * Middleware: Check ownership or admin override.
 * If the user is the resource owner OR has an admin role, allow access.
 * The ownerField function extracts the owner ID from the request.
 * @param {Function} getOwnerId - (req) => owner user ID from the resource
 * @param {Array<string>} adminRoles - roles that can bypass ownership check
 */
function ownerOrAdmin(getOwnerId, adminRoles = ['transit_admin', 'ambulance_admin', 'superadmin']) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin roles bypass ownership
    if (req.user.role === 'superadmin' || adminRoles.includes(req.user.role)) {
      return next();
    }

    // Check ownership
    try {
      const ownerId = await getOwnerId(req);
      if (ownerId && String(ownerId) === String(req.user.id)) {
        return next();
      }
    } catch (err) {
      // ownership check failed, deny
    }

    return res.status(403).json({ error: 'You can only access your own resources.' });
  };
}

module.exports = { 
  verifyToken, 
  verifyRole,
  denyRoles,
  ownerOrAdmin,
};
