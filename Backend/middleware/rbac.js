// middleware/rbac.js
const ErrorResponse = require('../utils/errorResponse');

/**
 * Role Based Access Control middleware
 * Checks if the authenticated user has the required permission
 * @param {string} permission - The permission required to access the route
 * @returns {function} - Express middleware function
 */
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    // Make sure user exists on request (auth middleware should run first)
    if (!req.user) {
      return next(new ErrorResponse('User not authenticated', 401));
    }

    // Check if user has the required permission
    if (!req.user.permissions.includes(permission)) {
      return next(
        new ErrorResponse(
          `User does not have permission: ${permission}`,
          403
        )
      );
    }

    next();
  };
};

/**
 * Role-based authorization middleware
 * Checks if the authenticated user has one of the required roles
 * @param {...string} roles - The roles allowed to access the route
 * @returns {function} - Express middleware function
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Make sure user exists on request (auth middleware should run first)
    if (!req.user) {
      return next(new ErrorResponse('User not authenticated', 401));
    }
    
    // Check if user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }

    next();
  };
};