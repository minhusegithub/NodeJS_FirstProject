import md5 from 'md5';
import { User, sequelize } from '../../models/sequelize/index.js';
import { Op } from 'sequelize';

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
        if (avatar !== undefined) updateData.avatar = avatar;
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
