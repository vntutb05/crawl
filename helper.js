function priceFormat(string){
    let length = string.length;
    if(string[0]!="$"){
        return string.slice(0,length-1).trim();
    }
    return string.slice(1,length-1);
}
function materialsFormat(string){
    let length = string.length;
    return string.slice(16,length-1);
}
function imageUriFormat(string){
    let length = string.length;
    return string.slice(length-10,length);
}
function indexCate(string){
    let index = string.indexOf("|");
    return string.slice(0,index).trim();
}

module.exports={
    priceFormat,materialsFormat,imageUriFormat,indexCate
}