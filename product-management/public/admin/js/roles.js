//delete Item permissionGroup
const buttonsDelete = document.querySelectorAll("[button-delete]");


if(buttonsDelete.length > 0){
    const formDeleteItem = document.querySelector("#form-delete-roles");

    
    const path = formDeleteItem.getAttribute("data-path");
   
    buttonsDelete.forEach(button =>{
        button.addEventListener("click" , ()=>{
            const isConfirm = confirm("Bạn có chắc muốn xóa nhóm quyền này không?");
            if(isConfirm){
                const id = button.getAttribute("data-id");

                const action = `${path}/${id}?_method=DELETE`;
                formDeleteItem.action =action;
                
                formDeleteItem.submit();
            }
        });
    });
}
//End delete Item permissionGroup
