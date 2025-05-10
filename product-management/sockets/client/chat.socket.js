const Chat = require('../../models/chat.model');
const uploadToCloudinary = require("../../helpers/uploadToCloudinary");



module.exports = async (req, res) => {
    const userId = res.locals.user.id;
    const fullName = res.locals.user.fullName;
    const roomChatId = req.params.roomChatId;
    // [SOCKET]
    _io.once('connection', (socket) => {
        socket.join(roomChatId); // gộp ông A và ông B vào cùng 1 phòng

        socket.on('CLIENT_SEND_MESSAGE', async (data)=>{

            let images = [];
            for(const imageBuffer of data.images){
                const link = await uploadToCloudinary(imageBuffer);
                images.push(link);
            }

            // Lưu vào DB
            const chat = new Chat({   
                user_id: userId,
                room_chat_id: roomChatId,
                content: data.content,
                images: images,
            });
            await chat.save();


            // Trả data lại cho client
            _io.to(roomChatId).emit('SERVER_RETURN_MESSAGE', {
                userId: userId,
                fullName: fullName,
                content: data.content,
                images: images,
            });
        });

        socket.on('CLIENT_SEND_TYPING', (type)=>{
            socket.broadcast.to(roomChatId).emit('SERVER_RETURN_TYPING', {
                userId: userId,
                fullName: fullName,
                type: type,
            });
        });
    });
    //End Socket
}