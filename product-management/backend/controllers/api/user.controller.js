import md5 from 'md5';
import uploadToCloudinary from '../../helpers/uploadToCloudinary.js';
import { User, StoreStaff, Role, Store, sequelize } from '../../models/sequelize/index.js';
import { Op } from 'sequelize';

// [GET] /api/v1/user/profile
export const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch user with store roles and permissions
        const user = await User.findByPk(userId, {
            // Only exclude password, allow all other fields
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: StoreStaff,
                    as: 'store_roles',
                    // Get all fields from intersection table
                    include: [
                        {
                            model: Role,
                            as: 'role_data',
                            // Get all role fields
                        },
                        {
                            model: Store,
                            as: 'store',
                            // Get all store fields
                        }
                    ]
                }
            ]
        });

        if (!user) {
            return res.status(404).json({
                code: 404,
                message: 'User not found'
            });
        }

        // Format response
        // Format response
        const profileData = {
            id: user.id,
            fullName: user.full_name,
            email: user.email,
            phone: user.phone,
            address: user.address,
            avatar: user.avatar,
            status: user.status,
            createdAt: user.createdAt || user.created_at,
            roles: user.store_roles ? user.store_roles.map(sr => ({
                storeId: sr.store_id,
                storeName: sr.store?.name,
                storeAddress: sr.store?.address,
                roleId: sr.role_id,
                roleName: sr.role_data?.name,
                roleDescription: sr.role_data?.description,
                roleScope: sr.role_data?.scope,
                permissions: sr.role_data?.permissions || [],
                assignedAt: sr.createdAt || sr.created_at
            })) : []
        };

        res.json({
            code: 200,
            message: 'Success',
            data: profileData
        });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({
            code: 500,
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

// [PATCH] /api/v1/user/info
export const updateInfo = async (req, res) => {
    try {
        const { fullName, email, phone, address, password, avatar } = req.body;
        // req.user is already populated by authenticateUser middleware (Sequelize instance)
        // Re-fetch to be safe or use req.user directly if managed?
        // Let's use User.update or instance.save()

        const userId = req.user.id;

        // Check email duplicate if email is changing
        if (email && email !== req.user.email) {
            const existingUser = await User.findOne({
                where: {
                    email: email,
                    id: { [Op.ne]: userId } // id != userId
                },
                paranoid: true
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email đã tồn tại!'
                });
            }
        }

        const updateData = {};
        if (fullName !== undefined) updateData.full_name = fullName;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (address !== undefined) updateData.address = address;

        if (req.file) {
            updateData.avatar = await uploadToCloudinary(req.file.buffer);
        } else if (avatar !== undefined) {
            updateData.avatar = avatar;
        }

        if (password) updateData.password = md5(password);

        await User.update(updateData, {
            where: { id: userId }
        });

        // Fetch updated user to return
        const updatedUser = await User.findByPk(userId);

        res.json({
            success: true,
            message: 'Cập nhật thông tin thành công!',
            data: {
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    fullName: updatedUser.full_name,
                    phone: updatedUser.phone,
                    address: updatedUser.address,
                    avatar: updatedUser.avatar
                }
            }
        });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
