// backend/src/middleware/auth.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

/**
 * Authentication middleware for protecting admin routes
 * Verifies JWT token from Authorization header
 */
export const authenticateAdmin = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No authorization token provided' 
      });
    }

    // Check if token is in correct format (Bearer <token>)
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ 
        error: 'Invalid token format',
        message: 'Authorization header must be in format: Bearer <token>' 
      });
    }

    const token = parts[1];
    
    // Verify the token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET
    );

    // Check if token has admin role
    if (decoded.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Admin privileges required' 
      });
    }

    // Add decoded user info to request object
    req.admin = {
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp
    };

    // Optional: Add token expiry check with grace period
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Please login again' 
      });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'The provided token is invalid' 
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Your session has expired, please login again' 
      });
    }

    return res.status(500).json({ 
      error: 'Authentication error',
      message: 'An error occurred during authentication' 
    });
  }
};

/**
 * Optional: More lenient auth middleware that doesn't require admin role
 * Useful for user-specific routes in the future
 */
export const authenticateUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // Instead of blocking, just set user to null
      req.user = null;
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      req.user = null;
      return next();
    }

    const token = parts[1];
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET
    );

    req.user = decoded;
    next();
  } catch (error) {
    // If token is invalid, continue without user
    req.user = null;
    next();
  }
};

/**
 * Rate limiting for login attempts (simple in-memory version)
 * For production, consider using Redis or a proper rate-limiting library
 */
const loginAttempts = new Map();

export const rateLimitLogin = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  // Clean up old entries
  if (loginAttempts.has(ip)) {
    const attempts = loginAttempts.get(ip);
    if (now - attempts.firstAttempt > windowMs) {
      loginAttempts.delete(ip);
    } else if (attempts.count >= maxAttempts) {
      const timeLeft = Math.ceil((windowMs - (now - attempts.firstAttempt)) / 1000 / 60);
      return res.status(429).json({
        error: 'Too many login attempts',
        message: `Please try again in ${timeLeft} minutes`
      });
    }
  }

  next();
};

export const recordLoginAttempt = (req, success) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!success) {
    if (!loginAttempts.has(ip)) {
      loginAttempts.set(ip, { count: 1, firstAttempt: now });
    } else {
      const attempts = loginAttempts.get(ip);
      attempts.count++;
    }
  } else {
    // Clear attempts on successful login
    loginAttempts.delete(ip);
  }
};

/**
 * Generate JWT token for admin
 */
export const generateAdminToken = (additionalData = {}) => {
  const payload = {
    role: 'admin',
    ...additionalData,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

/**
 * Hash password utility
 */
export const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Verify password utility
 */
export const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Optional: Validate admin password against environment variable
 * This is a simple approach - for production, consider storing hashed passwords in a database
 */
export const validateAdminPassword = async (password) => {
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('HASH EXISTS:', !!process.env.ADMIN_PASSWORD_HASH);
  console.log('HASH PREFIX:', process.env.ADMIN_PASSWORD_HASH?.slice(0, 7));
  console.log('PASSWORD RECEIVED:', password);
  // Safety guard for production
  if (!adminPasswordHash && process.env.NODE_ENV !== 'development') {
    console.error('Security Alert: ADMIN_PASSWORD_HASH environment variable is missing.');
    return false;
  }

  // If no hash is set, fall back to plain text comparison (development only)
  if (!adminPasswordHash && process.env.NODE_ENV === 'development') {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    return password === adminPassword;
  }

  // Production: Compare with hashed password
  const result = await bcrypt.compare(password, adminPasswordHash);

  console.log('COMPARE RESULT:', result);
  return await bcrypt.compare(password, adminPasswordHash);
};

/**
 * Middleware to validate request origin (CSRF protection)
 */
export const validateOrigin = (req, res, next) => {
  // Define allowed origins strictly from environment variables
  // Fallback to localhost only if explicitly in development mode
  const allowedOrigins = [
    process.env.FRONTEND_URL, 
    process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null
  ].filter(Boolean); // Remove nulls/undefined

  const origin = req.headers.origin;

  // Skip check for non-browser requests or if no origin header
  if (!origin || req.method === 'GET' || req.method === 'HEAD') {
    return next();
  }

  if (allowedOrigins.includes(origin)) {
    next();
  } else {
    console.warn(`Blocked request from unauthorized origin: ${origin}`);
    res.status(403).json({ 
      error: 'Forbidden',
      message: 'Origin not allowed' 
    });
  }
};

/**
 * Audit logging middleware
 */
export const auditLog = (req, res, next) => {
  const start = Date.now();
  
  // Store original end function
  const originalEnd = res.end;

  // Override end function to log after response is sent
  res.end = function(...args) {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      admin: req.admin?.role || 'unauthenticated'
    };

    // Log only non-GET requests or errors
    if (req.method !== 'GET' || res.statusCode >= 400) {
      console.log('[AUDIT]', JSON.stringify(logEntry));
    }

    // Call original end function
    originalEnd.apply(res, args);
  };

  next();
};