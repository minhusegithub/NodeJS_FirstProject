import { Store, User, StoreStaff } from '../../models/sequelize/index.js';
import { isRedisReady, redisDel } from '../../config/redis.js';

const invalidateUserCache = async (userId) => {
    if (userId && isRedisReady()) {
        await redisDel(`user:session:${userId}`);
    }
};

// [GET] /api/stores
export const getStores = async (req, res) => {
    try {
        const { page = 1, limit = 10, keyword, status } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        if (status) {
            where.is_active = status === 'active';
        }

        // TODO: Add search by keyword (Op.like) if needed

        const { count, rows } = await Store.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'manager',
                    attributes: ['id', 'full_name', 'email', 'phone']
                },
                {
                    model: StoreStaff,
                    as: 'staff',
                    attributes: ['id'], // Just count staff
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'full_name']
                        }
                    ]
                }
            ],
            distinct: true // Correct count with include
        });

        res.json({
            code: 200,
            message: "Success",
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get Stores Error:', error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// [GET] /api/stores/:id
export const getStoreDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const store = await Store.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'manager',
                    attributes: ['id', 'full_name', 'email', 'phone']
                },
                {
                    model: StoreStaff,
                    as: 'staff',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'full_name', 'email', 'phone', 'avatar']
                        }
                    ]
                }
            ]
        });

        if (!store) {
            return res.status(404).json({
                code: 404,
                message: "Store not found"
            });
        }

        res.json({
            code: 200,
            message: "Success",
            data: store
        });
    } catch (error) {
        console.error('Get Store Detail Error:', error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// [POST] /api/stores
export const createStore = async (req, res) => {
    try {
        const { code, name, address, contact, manager_email } = req.body;

        // Validation
        if (!code || !name) {
            return res.status(400).json({
                code: 400,
                message: "Code and Name are required"
            });
        }

        // Check duplicate code
        const existingStore = await Store.findOne({ where: { code } });
        if (existingStore) {
            return res.status(400).json({
                code: 400,
                message: `Store code "${code}" already exists`
            });
        }

        // Find manager by email if provided
        let managerId = null;
        if (manager_email) {
            const manager = await User.findOne({ where: { email: manager_email } });
            if (!manager) {
                return res.status(400).json({
                    code: 400,
                    message: `User with email "${manager_email}" not found`
                });
            }
            managerId = manager.id;
        }

        // Create store
        const newStore = await Store.create({
            code,
            name,
            address, // Expect JSON object: {street, district, city}
            contact, // Expect JSON object: {phone, email}
            manager_id: managerId,
            is_active: true
        });

        // Auto-assign manager as StoreStaff with storeManager role
        if (managerId) {
            const { Role } = await import('../../models/sequelize/index.js');
            const storeManagerRole = await Role.findOne({ where: { name: 'storeManager' } });

            if (storeManagerRole) {
                await StoreStaff.create({
                    user_id: managerId,
                    store_id: newStore.id,
                    role_id: storeManagerRole.id,
                    is_active: true
                });
            }
        }

        // Fetch created store with manager info
        const storeWithManager = await Store.findByPk(newStore.id, {
            include: [
                {
                    model: User,
                    as: 'manager',
                    attributes: ['id', 'full_name', 'email', 'phone']
                }
            ]
        });

        res.status(201).json({
            code: 201,
            message: "Store created successfully",
            data: storeWithManager
        });
    } catch (error) {
        console.error('Create Store Error:', error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// [PUT] /api/stores/:id
export const updateStore = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, address, contact, manager_email, is_active } = req.body;

        const store = await Store.findByPk(id);
        if (!store) {
            return res.status(404).json({
                code: 404,
                message: "Store not found"
            });
        }

        // Track if current user will lose manager role
        const currentUserId = req.user?.id;
        
        let roleChanged = false;
        
        // Prevent updating code to existing one
        if (code && code !== store.code) {
            const existing = await Store.findOne({ where: { code } });
            if (existing) {
                return res.status(400).json({
                    code: 400,
                    message: `Store code "${code}" already exists`
                });
            }
        }

        // Handle manager_email if provided
        let managerId = store.manager_id; // Keep existing if not changing
        if (manager_email !== undefined) {
            if (manager_email) {
                const manager = await User.findOne({ where: { email: manager_email } });
                if (!manager) {
                    return res.status(400).json({
                        code: 400,
                        message: `User with email "${manager_email}" not found`
                    });
                }
                managerId = manager.id;

                // Update StoreStaff if manager changed
                if (managerId !== store.manager_id) {
                    // Check if current user is losing manager role
                    // This applies to:
                    // - storeManager changing themselves to another manager
                    // - SystemAdmin who is also manager of this store, changing to another manager
                    // But NOT for SystemAdmin changing manager of other stores
                    
                    if (currentUserId && parseInt(store.manager_id) === parseInt(currentUserId)) {
                        roleChanged = true;
                    }

                    const { Role } = await import('../../models/sequelize/index.js');
                    const storeManagerRole = await Role.findOne({ where: { name: 'storeManager' } });

                    if (storeManagerRole) {
                        // Update old manager's role_id to null instead of destroying
                        if (store.manager_id) {
                            await StoreStaff.update(
                                { role_id: null },
                                {
                                    where: {
                                        user_id: store.manager_id,
                                        store_id: id,
                                        role_id: storeManagerRole.id
                                    }
                                }
                            );
                            // Invalidate old manager's Redis cache so their next request reloads roles from DB
                            await invalidateUserCache(store.manager_id);
                        }

                        // Check if new manager already exists in StoreStaff
                        const existingStaff = await StoreStaff.findOne({
                            where: {
                                user_id: managerId
                                
                            }
                        });

                        if (existingStaff) {
                            
                            // Check if existingStaff at store_id :id or not, if yes then update role_id to storeManager,
                            //  if no (it mean that user is staff at other store) then response error because one user can only be manager of one store
                            if (existingStaff.store_id.toString() !== id.toString()) {
                                console.log(existingStaff.store_id, id);
                                return res.status(400).json({
                                    code: 400,
                                    message: `User with email "${manager_email}" is already a staff member of another store`
                                });
                            }
                            await existingStaff.update({
                                role_id: storeManagerRole.id                              
                            });
                        } else {
                            // Create new staff record
                            await StoreStaff.create({
                                user_id: managerId,
                                store_id: id,
                                role_id: storeManagerRole.id,
                                is_active: true
                            });
                        }
                        // Invalidate new manager's Redis cache so their next request picks up the new role
                        await invalidateUserCache(managerId);
                    }
                }
            } else {
                // manager_email is null/empty - remove manager
                // Check if current user is losing manager role
                if (currentUserId && parseInt(store.manager_id) === parseInt(currentUserId)) {
                    roleChanged = true;
                }
                // Invalidate old manager's cache
                await invalidateUserCache(store.manager_id);
                managerId = null;
            }
        }

        // Update store
        await store.update({
            ...(code && { code }),
            ...(name && { name }),
            ...(address && { address }),
            ...(contact && { contact }),
            ...(manager_email !== undefined && { manager_id: managerId }),
            ...(is_active !== undefined && { is_active })
        });

        // Fetch updated store with manager
        const updatedStore = await Store.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'manager',
                    attributes: ['id', 'full_name', 'email', 'phone']
                }
            ]
        });

        res.json({
            code: 200,
            message: "Store updated successfully",
            data: updatedStore,
            roleChanged, // Flag to tell frontend that current user's role changed
            requiresReauth: roleChanged // Frontend should refresh user info
        });
    } catch (error) {
        console.error('Update Store Error:', error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// [DELETE] /api/stores/:id
export const deleteStore = async (req, res) => {
    try {
        const { id } = req.params;

        const store = await Store.findByPk(id);
        if (!store) {
            return res.status(404).json({
                code: 404,
                message: "Store not found"
            });
        }

        // Soft delete (if paranoid: true in model)
        await store.destroy();

        res.json({
            code: 200,
            message: "Store deleted successfully"
        });
    } catch (error) {
        console.error('Delete Store Error:', error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error",
            error: error.message
        });
    }
};
