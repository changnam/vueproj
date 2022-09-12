const numbers = [175, 50, 25];

//document.getElementById("demo").innerHTML = numbers.reduce(myFunc);
const sumValue = numbers.reduce(sumFunc,0);

console.log(sumValue);

function myFunc(total, value, idx, arr) {
console.log("----t"+total);
console.log("----n"+value)
  return total - value;
}


function sumFunc(total, value) {
console.log("----t"+total);
console.log("----n"+value)
  return total + value;
}

//---t 1000
//---n 175
//---t 825
//---n 50
//---t 775
//---n 25

//-t0
//-n175
//-175
//-n50
//-t225
//n-25
