//Show alert
const showAlert = document.querySelector("[show-alert]");
if(showAlert){
    const time = parseInt (showAlert.getAttribute("data-time")) ;
    const closeAlert = showAlert.querySelector("[close-alert]");

    setTimeout( ()=>{
        showAlert.classList.add("alert-hidden");
    }, time);

    closeAlert.addEventListener("click" , ()=>{
        showAlert.classList.add("alert-hidden");
    });

}
//End show alert


// Button go back
const buttonGoBack = document.querySelectorAll("[button-go-back]");
if(buttonGoBack.length > 0){
    buttonGoBack.forEach(button=>{
        button.addEventListener("click" , ()=>{
            history.back(); 
        })
    })
}
// End button go back

// Giao hàng nhanh
const isPlaceRushOrder = document.querySelector('#isPlaceRushOrder');
if(isPlaceRushOrder){
    isPlaceRushOrder.addEventListener('change', function() {
        const fullName = document.querySelector('#fullName').value;
        const phone = document.querySelector('#phone').value;
        const address = document.querySelector('#address').value;
        const paymentMethod = document.querySelector('#paymentMethod').value;
        const isPlaceRushOrder = document.querySelector('#isPlaceRushOrder').value;
        
        window.location.href = `/checkout/placeRushOrder/${fullName}/${phone}/${address}/${isPlaceRushOrder}/${paymentMethod}`;
            
        
    });
}
// End giao hàng nhanh


// Upload image
const uploadImage = document.querySelector("[upload-image]");
if(uploadImage){
    const uploadImageInput = document.querySelector("[upload-image-input]");
    const uploadImagePreview  = document.querySelector("[upload-image-preview]");
    const uploadPlaceholder = document.querySelector(".upload-placeholder");

    uploadImageInput.addEventListener("change" , (e)=>{
        const file = e.target.files[0];
        if(file){
            uploadImagePreview.src = URL.createObjectURL(file);
            uploadImagePreview.style.display = "block";
            uploadPlaceholder.style.display = "none";
        }
    });

}

// End upload image


// Change status order

const buttonChangeOrderStatus = document.querySelectorAll("[button-change-order-status]");
if(buttonChangeOrderStatus.length > 0){
    const formChangeStatus = document.querySelector("#form-change-order-status");
    const path = formChangeStatus.getAttribute("data-path");
   
    buttonChangeOrderStatus.forEach(button =>{
        button.addEventListener("click" , ()=>{
            const statusCurrent = button.getAttribute("data-status");
            const id = button.getAttribute("data-id");
             // nếu trạng thái là "Processing" thì sẽ thành "Cancelled"  , nếu là "Delivering" thì sẽ thành "Received" 
            if(statusCurrent == "Processing"){
                let statusChange = "Cancelled"
                const action = path + `/${statusChange}/${id}?_method=PATCH`;          
                formChangeStatus.action = action;
            }
            if(statusCurrent == "Delivering"){
                let statusChange = "Received"
                const action = path + `/${statusChange}/${id}?_method=PATCH`;          
                formChangeStatus.action = action;
            }        

            formChangeStatus.submit();
        })

    })
}

// End change status order
