/**
 * RBAC Middleware
 * @param {string[]} allowedRoles - Array of allowed roles e.g. ['storeManager', 'OrderStaff']
 * @param {object} options
 * @param {boolean} options.requireStoreContext - If true, enforces store_id presence and matching role.
 */
export const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // If no specific roles required, allow
        if (allowedRoles.length === 0) {
            return next();
        }

        // Get user's store roles
        const userStoreRoles = req.user.store_roles || [];

        // Determine context Store ID
        // Priority: params.storeId -> params.id (if this is a store route) -> query.store_id -> body.store_id
        // Note: Be careful with params.id, it might be Order ID or Product ID. 
        // Safer to rely on standard param names or explicitly pass logic.
        // For now, let's look for explicit 'store_id' or 'storeId' keys in request.

        let targetStoreId =
            req.params.storeId ||
            req.query.store_id ||
            req.body.store_id;

        // If simple route like /api/v1/stores/:id, and we are checking manager role, id IS the store id
        if (!targetStoreId && req.baseUrl.includes('/stores') && req.params.id) {
            targetStoreId = req.params.id;
        }

        // Debug
        // console.log('RBAC Check:', { allowedRoles, targetStoreId, userRoles: userStoreRoles.map(r => ({role: r.role, store: r.store_id})) });

        if (targetStoreId) {
            // Context-aware check
            const hasPermission = userStoreRoles.some(r => {
                const roleName = r.role_data?.name;
                const permissions = r.role_data?.permissions || [];
                const roleScope = r.role_data?.scope;

                // Check if role matches
                const roleMatches = allowedRoles.includes(roleName) ||
                    allowedRoles.some(p => permissions.includes(p));

                if (!roleMatches) return false;

                // System-level roles (scope='system' or store_id=NULL) bypass store checks
                if (roleScope === 'system' || r.store_id === null) {
                    return true;
                }

                // Store-level roles must match the target store
                return r.store_id == targetStoreId;
            });

            if (!hasPermission) {
                return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission for this Store' });
            }
        } else {
            // No specific store context
            const hasRoleAnywhere = userStoreRoles.some(r => {
                const roleName = r.role_data?.name;
                const permissions = r.role_data?.permissions || [];

                if (allowedRoles.includes(roleName)) return true;
                return allowedRoles.some(p => permissions.includes(p));
            });

            if (!hasRoleAnywhere) {
                return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
            }
        }

        next();
    };
};
