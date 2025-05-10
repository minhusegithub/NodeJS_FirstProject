// Chức năng gửi yêu cầu kết bạn
const listBtnAddFriend = document.querySelectorAll('[btn-add-friend]');
if(listBtnAddFriend.length > 0){
    listBtnAddFriend.forEach(button => {
        button.addEventListener('click', (e) => {
            button.closest(".box-user").classList.add("add");
            const userId = button.getAttribute('btn-add-friend');
            socket.emit("CLIENT_ADD_FRIEND", userId);

        });
    });
}
// Hết chức năng gửi yêu cầu kết bạn

// Chức năng hủy gửi yêu cầu kết bạn
const listBtnCancelFriend = document.querySelectorAll('[btn-cancel-friend]');
if(listBtnCancelFriend.length > 0){
    listBtnCancelFriend.forEach(button => {
        button.addEventListener('click', (e) => {
            button.closest(".box-user").classList.remove("add");
            const userId = button.getAttribute('btn-cancel-friend');
            socket.emit("CLIENT_CANCEL_FRIEND", userId);
        });
    });
}
// Hết chức năng hủy gửi yêu cầu kết bạn


// Chức năng từ chối yêu cầu kết bạn
const listBtnRefuseFriend = document.querySelectorAll('[btn-refuse-friend]');
if(listBtnRefuseFriend.length > 0){
    listBtnRefuseFriend.forEach(button => {
        button.addEventListener('click', (e) => {
            button.closest(".box-user").classList.add("refuse");
            const userId = button.getAttribute('btn-refuse-friend');
            socket.emit("CLIENT_REFUSE_FRIEND", userId);
        });
    });
}
// Hết chức năng từ chối yêu cầu kết bạn


// Chức năng chấp nhận yêu cầu kết bạn
const listBtnAcceptFriend = document.querySelectorAll('[btn-accept-friend]');
if(listBtnAcceptFriend.length > 0){
    listBtnAcceptFriend.forEach(button => {
        button.addEventListener('click', (e) => {
            button.closest(".box-user").classList.add("accepted");
            const userId = button.getAttribute('btn-accept-friend');
            socket.emit("CLIENT_ACCEPT_FRIEND", userId);
        });
    });
}
// Hết chức năng chấp nhận yêu cầu kết bạn

//SERVER_RETURN_LENGTH_ACCEPT_FRIEND
socket.on('SERVER_RETURN_LENGTH_ACCEPT_FRIEND', (data) => {
    
    const badgeUsersAccept = document.querySelector(`[badge-users-accept]`);
    const userId = badgeUsersAccept.getAttribute('badge-users-accept');
    if(userId == data.userId){
        badgeUsersAccept.innerHTML = data.lengthAcceptFriends;
    }
      
});
// Hết SERVER_RETURN_LENGTH_ACCEPT_FRIEND


//SERVER_RETURN_INFO_ACCEPT_FRIEND
socket.on('SERVER_RETURN_INFO_ACCEPT_FRIEND', (data) => {
    // Trang lời mời kết bạn
    const dataUsersAccept = document.querySelector(`[data-users-accept]`);
    if(dataUsersAccept){
        const userId = dataUsersAccept.getAttribute('data-users-accept');
        if(userId == data.userId){
            const newBoxUser = document.createElement('div');
            newBoxUser.classList.add('col-6');
            newBoxUser.setAttribute('user-id', data.infoUserA._id);

            newBoxUser.innerHTML =`         
                <div class="box-user">
                    <div class="inner-avatar">
                        <img src="${data.infoUserA.avatar}" alt="${data.infoUserA.fullName}">
                    </div>
                    <div class="inner-info">
                        <div class="inner-name">${data.infoUserA.fullName}</div>
                        <div class="inner-button">
                            <button
                                class="btn btn-sm btn-primary mr-1" btn-accept-friend="${data.infoUserA._id}"
                            >Chấp nhận
                            </button>                          
                            <button
                                class="btn btn-sm btn-secondary mr-1" btn-refuse-friend="${data.infoUserA._id}"
                            >Xóa
                            </button>
                            <button
                                class="btn btn-sm btn-secondary mr-1" btn-deleted-friend="btn-deleted-friend" disabled="disabled"
                            >Đã xóa
                            </button>
                            <button
                                class="btn btn-sm btn-primary mr-1" btn-accepted-friend="btn-accepted-friend" disabled="disabled"
                            >Đã chấp nhận
                            </button>
                        </div>
                    </div>
                </div>
            ` 
            
            dataUsersAccept.appendChild(newBoxUser);  
            
            // Xóa lời mời kết bạn
            const btnRefuseFriend = newBoxUser.querySelector(`[btn-refuse-friend]`);
            
            btnRefuseFriend.addEventListener('click', (e) => {
                btnRefuseFriend.closest(".box-user").classList.add("refuse");
                const userId = btnRefuseFriend.getAttribute('btn-refuse-friend');
                socket.emit("CLIENT_REFUSE_FRIEND", userId);
            });
            // Chấp nhận kết bạn
            const btnAcceptFriend = newBoxUser.querySelector(`[btn-accept-friend]`);
            btnAcceptFriend.addEventListener('click', (e) => {
                btnAcceptFriend.closest(".box-user").classList.add("accepted");
                const userId = btnAcceptFriend.getAttribute('btn-accept-friend');
                socket.emit("CLIENT_ACCEPT_FRIEND", userId);
            });

        }  
    }

    // Trang danh sách người dùng
     
    const dataUsersNotFriend = document.querySelector(`[data-users-not-friend]`);
   
    if(dataUsersNotFriend){
        const userId = dataUsersNotFriend.getAttribute('data-users-not-friend');
       
        if(userId == data.userId){
            //Xóa A khỏi danh sách của B
            const boxUserRemove = dataUsersNotFriend.querySelector(`[user-id="${data.infoUserA._id}"]`);
            
            if(boxUserRemove){
                dataUsersNotFriend.removeChild(boxUserRemove);
            }
        }
    }

});
// Hết SERVER_RETURN_INFO_ACCEPT_FRIEND


//SERVER_RETURN_USED_ID_CANCEL_FRIEND
socket.on('SERVER_RETURN_USED_ID_CANCEL_FRIEND', (data) => {
    const dataUsersAccept = document.querySelector(`[data-users-accept]`);
    const userId = dataUsersAccept.getAttribute('data-users-accept');
    
    if(userId == data.userId){
        const boxUserRemove = dataUsersAccept.querySelector(`[user-id="${data.userIdA}"]`);
        
        if(boxUserRemove){
            dataUsersAccept.removeChild(boxUserRemove);
        }
    }
    
});
// Hết SERVER_RETURN_USED_ID_CANCEL_FRIEND






