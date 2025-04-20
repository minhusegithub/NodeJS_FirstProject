//Cập nhật số lượng sản phẩm
const inputsQuantity = document.querySelectorAll("input[name='quantity']");

if(inputsQuantity.length > 0){
    inputsQuantity.forEach(input=>{
       input.addEventListener("change" , (e)=>{
            const productId = input.getAttribute("product-id");
            const quantity = input.value;

            if(quantity > 0){
                // Chuyển đến route tương ứng để xử lí
                window.location.href = `/cart/update/${productId}/${quantity}`;
            }

           
       }); 
    });
}
// Hết cập nhật số lượng sản phẩm
