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