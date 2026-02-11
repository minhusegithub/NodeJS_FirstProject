/**
 * Role-based authorization middleware
 * Checks if authenticated user has required role(s)
 */
export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({
                code: 401,
                message: 'Unauthorized - Please login first'
            });
        }

        // Check if user has roles
        if (!req.user.roles || req.user.roles.length === 0) {
            return res.status(403).json({
                code: 403,
                message: 'Forbidden - No roles assigned'
            });
        }

        // Extract role names from user's roles
        const userRoleNames = req.user.roles.map(role => role.roleName);

        // Check if user has at least one of the allowed roles
        const hasRequiredRole = allowedRoles.some(role => userRoleNames.includes(role));

        if (!hasRequiredRole) {
            return res.status(403).json({
                code: 403,
                message: `Forbidden - Required role: ${allowedRoles.join(' or ')}`
            });
        }

        // User has required role, proceed
        next();
    };
};
