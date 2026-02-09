import md5 from 'md5';
import { User, StoreStaff, Role, Store, sequelize } from '../../../models/sequelize/index.js';
import { Op } from 'sequelize';

// [POST] /api/v1/admin/store-users
export const create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { fullName, email, password, phone, address, storeId } = req.body;

        // 1. Basic Validation
        if (!fullName || !email || !password) {
            await t.rollback();
            return res.json({ code: 400, message: 'Vui lòng nhập đầy đủ: Họ tên, Email, Mật khẩu!' });
        }

        // 2. Identify Target Store
        // Get list of stores managed by current user
        const managedStoreIds = req.user.store_roles?.filter(role =>
            role.role_data?.name === 'storeManager' ||
            role.role_data?.permissions?.includes('manage_staff') ||
            role.role_data?.name === 'SystemAdmin'
        ).map(r => r.store_id);

        const isSystemAdmin = req.user.store_roles?.some(r => r.role_data?.name === 'SystemAdmin');

        let targetStoreId = storeId;

        // Auto-select first managed store if not provided
        if (!targetStoreId && managedStoreIds.length > 0) {
            targetStoreId = managedStoreIds[0];
        }

        if (!targetStoreId) {
            await t.rollback();
            return res.json({ code: 400, message: 'Không xác định được cửa hàng để thêm nhân viên.' });
        }

        // Permission check
        if (!isSystemAdmin && !managedStoreIds.includes(parseInt(targetStoreId))) {
            await t.rollback();
            return res.json({ code: 403, message: 'Bạn không có quyền thêm nhân viên vào cửa hàng này.' });
        }

        // 3. Check Email Existence
        const existUser = await User.findOne({ where: { email } });
        if (existUser) {
            await t.rollback();
            return res.json({ code: 400, message: 'Email này đã được sử dụng!' });
        }

        // 4. Create User
        const newUser = await User.create({
            full_name: fullName,
            email,
            password: md5(password),
            phone,
            address,
            status: 'active',
            avatar: ''
        }, { transaction: t });

        // 5. Assign Role (Default: NULL - Unassigned)
        // System allows creating staff without role initially
        const roleId = null;

        // 6. Create StoreStaff Record
        await StoreStaff.create({
            user_id: newUser.id,
            store_id: targetStoreId,
            role_id: roleId,
            is_active: true
        }, { transaction: t });

        await t.commit();

        res.json({
            code: 200,
            message: 'Thêm nhân viên thành công!',
            data: {
                ...newUser.toJSON(),
                roleName: null
            }
        });

    } catch (error) {
        await t.rollback();
        console.error('Create Staff Error:', error);
        res.status(500).json({
            code: 500,
            message: 'Lỗi server: ' + error.message
        });
    }
};

// [GET] /api/v1/admin/store-users
export const index = async (req, res) => {
    try {
        // 1. Identify managed stores
        // req.user populated by authenticateUser middleware

        // Find stores where user has 'storeManager' role or 'manage_staff' permission
        const managedStores = req.user.store_roles?.filter(role =>
            role.role_data?.name === 'storeManager' ||
            role.role_data?.permissions?.includes('manage_staff')
        ).map(r => r.store_id).filter(Boolean);

        const isSystemAdmin = req.user.store_roles?.some(r =>
            r.role_data?.name === 'SystemAdmin' || r.role_data?.scope === 'system'
        );

        const whereClause = {};

        // If NOT System Admin, restrict to managed stores
        if (!isSystemAdmin) {
            if (!managedStores || managedStores.length === 0) {
                return res.json({
                    code: 200,
                    message: 'Bạn không quản lý cửa hàng nào.',
                    data: []
                });
            }
            whereClause.store_id = { [Op.in]: managedStores };
        }

        // 2. Query StoreStaff
        const staffList = await StoreStaff.findAll({
            where: {
                ...whereClause

            },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: { exclude: ['password', 'token_user'] }
                },
                {
                    model: Role,
                    as: 'role_data',
                    attributes: ['id', 'name', 'description']
                },
                {
                    model: Store,
                    as: 'store',
                    attributes: ['id', 'name', 'address']
                }
            ],
            order: [['id', 'DESC']]
        });

        // 3. Format Data
        const formattedData = staffList.map(item => ({
            id: item.user.id,         // User ID (for linking)
            staffId: item.id,         // StoreStaff ID (for editing role)
            fullName: item.user.full_name,
            email: item.user.email,
            phone: item.user.phone,
            address: item.user.address, // Added address field
            avatar: item.user.avatar,
            status: item.user.status,
            roleName: item.role_data?.name,
            storeName: item.store?.name,
            storeId: item.store_id,
            joinedAt: item.createdAt || item.created_at
        }));

        res.json({
            code: 200,
            data: formattedData
        });

    } catch (error) {
        console.error('Get Store Users Error:', error);
        res.status(500).json({
            code: 500,
            message: 'Lỗi server: ' + error.message
        });
    }
};

// [GET] /api/v1/admin/store-users/roles
export const getRoles = async (req, res) => {
    try {
        // Fetch all roles except SystemAdmin
        const roles = await Role.findAll({
            where: {
                name: { [Op.ne]: 'SystemAdmin' },
                scope: { [Op.ne]: 'system' }
            },
            attributes: ['id', 'name']
        });

        res.json({
            code: 200,
            data: roles
        });
    } catch (error) {
        console.error('Get Roles Error:', error);
        res.status(500).json({ code: 500, message: error.message });
    }
};

// [PUT] /api/v1/admin/store-users/:id
export const update = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params; // store_staff id
        const { fullName, email, password, phone, address, roleId, status } = req.body;

        const staff = await StoreStaff.findByPk(id, {
            include: [{ model: User, as: 'user' }]
        });

        if (!staff) {
            await t.rollback();
            return res.json({ code: 404, message: 'Nhân viên không tồn tại' });
        }

        // 1. Update User Record
        const userData = {
            full_name: fullName,
            phone,
            address,
            // Sync user status with staff status logic if needed
            status: status === 'active' ? 'active' : 'inactive'
        };

        if (password) {
            userData.password = md5(password);
        }

        // Check email uniqueness if changed
        if (email && email !== staff.user.email) {
            const exist = await User.findOne({
                where: {
                    email,
                    id: { [Op.ne]: staff.user_id }
                }
            });
            if (exist) {
                await t.rollback();
                return res.json({ code: 400, message: 'Email đã tồn tại' });
            }
            userData.email = email;
        }

        await User.update(userData, {
            where: { id: staff.user_id },
            transaction: t
        });

        // 2. Update StoreStaff Record
        const staffData = {
            is_active: status === 'active'
        };

        // Handle Role Update
        if (roleId) {
            staffData.role_id = roleId;
        } else if (roleId === null || roleId === '') {
            // Allow unassigning role
            staffData.role_id = null;
        }

        await StoreStaff.update(staffData, {
            where: { id },
            transaction: t
        });

        await t.commit();

        res.json({
            code: 200,
            message: 'Cập nhật thành công!'
        });

    } catch (error) {
        await t.rollback();
        console.error('Update Staff Error:', error);
        res.status(500).json({ code: 500, message: error.message });
    }
};
