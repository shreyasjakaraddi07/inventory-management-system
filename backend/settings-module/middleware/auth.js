import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Verify JWT token
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    req.user = user;
    next();
  });
};

// Role-based access control
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role || 'staff';
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
};

// Check if user owns the business or is admin
export const authorizeBusinessAccess = async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Admin can access all businesses
    if (userRole === 'admin') {
      return next();
    }

    // Import here to avoid circular dependency
    const { query } = await import('./db.js');
    
    // Check if user owns this business
    const result = await query(
      'SELECT business_id FROM businesses WHERE business_id = $1 AND owner_id = $2',
      [businessId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this business'
      });
    }

    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

// Generate JWT token
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Verify token and return decoded user
export const verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
};

export default {
  authenticateToken,
  authorizeRoles,
  authorizeBusinessAccess,
  generateToken,
  verifyToken
};
