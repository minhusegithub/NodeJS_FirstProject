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
                ...whereClause,
                is_active: true
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
