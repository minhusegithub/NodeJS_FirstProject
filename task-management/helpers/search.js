module.exports = (query )=>{
    let objectSearch ={
        keyword: ""
       
    }

    if(query.keyword){
        objectSearch.keyword = query.keyword;
        var regex = new RegExp(objectSearch.keyword , "i");// Tim kiem khong chinh qui , khong phan biet hoa thuong
        objectSearch.regex = regex;
    }
    return objectSearch;
}