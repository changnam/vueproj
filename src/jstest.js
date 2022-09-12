//let arr = [10, 20, 40, 400, 500]

//let result = arr.filter(function (value,index, arr){
//	return value > 100;
//})

//console.log(result);


 let arr = [];
    arr[0] = "one";
    arr[1] = "two";
    arr[3] = "three";
    arr[2] = "four";
	console.log(arr);
     let abc = arr.filter(function (value,index,arr){
        if( index == 1 || index == 2) return true;
    })
    console.log(abc);
 
 
console.log( 1 == [1]);  