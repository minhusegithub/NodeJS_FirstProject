import md5 from 'md5';
import User from '../../models/user.model.js';

// [PATCH] /api/v1/user/info
export const updateInfo = async (req, res) => {
    try {
        const { fullName, email, phone, address, password, avatar } = req.body;
        const userId = req.user.id;

        const updateData = {
            fullName,
            email,
            phone,
            address,
            avatar
        };

        // Nếu có password mới thì hash và cập nhật
        if (password) {
            updateData.password = md5(password);
        }

        // Xóa các trường undefined hoặc rỗng ("") nếu cần thiết
        // Nhưng ở đây ta cứ update thẳng, nếu frontend gửi string rỗng thì update rỗng

        // Kiểm tra email trùng (ngoại trừ user hiện tại)
        if (email) {
            const existingUser = await User.findOne({
                email: email,
                deleted: false,
                _id: { $ne: userId }
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email đã tồn tại!'
                });
            }
        }

        const user = await User.findByIdAndUpdate(userId, updateData, { new: true });

        res.json({
            success: true,
            message: 'Cập nhật thông tin thành công!',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    fullName: user.fullName,
                    phone: user.phone,
                    address: user.address,
                    avatar: user.avatar
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
