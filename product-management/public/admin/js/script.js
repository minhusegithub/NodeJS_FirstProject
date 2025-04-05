

// Button Status
const buttonStatus = document.querySelectorAll("[button-status]");
if(buttonStatus.length > 0){
    let url = new URL(window.location.href); // lay ra url hien tai
    
    buttonStatus.forEach(button =>{
        button.addEventListener("click" , ()=>{ // bat su kien
            const status = button.getAttribute("button-status");
            
            if(status){
                url.searchParams.set("status" , status);// String nam sau dau "?" tren URL la : url.searchParams
            }
            else{
                url.searchParams.delete("status");
            }
            window.location.href = url.href;//chuyen den URL moi
           
        });
    });
}
// End Button Status

// Form search
const formSearch = document.querySelector("#form-search");
if(formSearch){

    let url = new URL(window.location.href);
    
    formSearch.addEventListener("submit" , (event) =>{
        event.preventDefault();// ngan khong tai lai trang
        
        const keyword =event.target.elements.keyword.value;
        if(keyword){
            url.searchParams.set("keyword" ,keyword );
        }else{
            url.searchParams.delete("keyword");
        }
        window.location.href = url.href;

    });

}
// End form search

// Pagination
const buttonPagination = document.querySelectorAll("[button-pagination]");
if(buttonPagination){

    let url = new URL(window.location.href);

    buttonPagination.forEach(button =>{
        button.addEventListener("click" , ()=>{
            const page = button.getAttribute("button-pagination");
            
            url.searchParams.set("page" ,page );
            
            window.location.href = url.href;
        });
    });
}
// End Pagination


//Checkbox Multi
const checkboxMulti = document.querySelector("[checkbox-multi]");
if(checkboxMulti){
    const inputCheckAll = checkboxMulti.querySelector("input[name='checkall']");
    const intputsId = checkboxMulti.querySelectorAll("input[name='id']");
    
    inputCheckAll.addEventListener("click" , ()=>{
        if(inputCheckAll.checked){ 
            intputsId.forEach(input=>{
                input.checked = true;
            });
        }else{
            intputsId.forEach(input=>{
                input.checked = false;
            });
        }
    });

    intputsId.forEach(input =>{
        input.addEventListener("click" , ()=>{
            const countChecked = checkboxMulti.querySelectorAll("input[name='id']:checked").length ;
            if(countChecked == intputsId.length){
                inputCheckAll.checked = true;
            }else{
                inputCheckAll.checked = false;
            }
        })
    })
}
//End Checkbox Multi


//Form change Multi
const formChangeMulti = document.querySelector("[form-change-multi]");
if(formChangeMulti){
    formChangeMulti.addEventListener("submit" , (e)=>{
        e.preventDefault();
        const checkboxMulti = document.querySelector("[checkbox-multi]");
        const inputsChecked = checkboxMulti.querySelectorAll(
            "input[name='id']:checked"
        )

        const typeChange = e.target.elements.type.value;

        if(typeChange == "delete-all"){
            const isConfirm = confirm("Ban co chac muon xoa nhung san pham nay?");
            if(!isConfirm){
                return;
            }

        }

        if(inputsChecked.length > 0){
            let ids = [];
            const inputIds = formChangeMulti.querySelector("input[name='ids']");

            inputsChecked.forEach(input=>{
                const id = input.value;

                if(typeChange == "change-position"){
                    const position = input
                    .closest("tr")
                    .querySelector("input[name='position']").value ;
                    
                    
                    ids.push(`${id}-${position}`);  
                }else{
                    ids.push(id);  
                }
            });
           
            inputIds.value =  ids.join(", ");
            
            formChangeMulti.submit();// gui len server ids

        }else{
            alert("Vui lòng chọn ít nhất 1 bản ghi");
        }
        

    });
}
//End form change Multi

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


// Upload image
const uploadImage = document.querySelector("[ upload-image]");
if(uploadImage){
    const uploadImageInput = document.querySelector("[upload-image-input]");
    const uploadImagePreview  = document.querySelector("[upload-image-preview]");

    uploadImageInput.addEventListener("change" , (e)=>{
        const file = e.target.files[0];
        if(file){
            uploadImagePreview.src = URL.createObjectURL(file);
        }
    });

}
// End upload image


//Sort
const sort = document.querySelector("[sort]");
if(sort){
    let url = new URL(window.location.href);

    const sortSelect = sort.querySelector("[sort-select]");
    const sortClear = sort.querySelector("[sort-clear]");

    sortSelect.addEventListener("change", (e)=>{
        const value = e.target.value;      
        const [sortKey , sortValue] = value.split("-"); 

        url.searchParams.set("sortKey" , sortKey);
        url.searchParams.set("sortValue" , sortValue);

        window.location.href = url.href;
    })

    //Xoa sap xep
    sortClear.addEventListener("click" , (e)=>{
        url.searchParams.delete("sortKey");
        url.searchParams.delete("sortValue");
        window.location.href = url.href;
    })
    //Them selected cho option
    const sortKey = url.searchParams.get("sortKey");
    const sortValue = url.searchParams.get("sortValue");

    if(sortKey && sortValue){
        const stringSort = `${sortKey}-${sortValue}`;
        const optionSelected = sortSelect.querySelector(`option[value=${stringSort}]`);
        optionSelected.selected = true;
    }
}
//End sort





