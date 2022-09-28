
function childComponent( ...props ){ //caller
  console.log( props );
};

const message = "passed from Parent Component";
value = childComponent( ...message ) //caller

//--------------------------------------------------



function add(...args){
	//console.log(args);
	let total = 0;
	for(const arg of args){
		total+=arg;
	}
	return total;
}
console.log(add(4,5,10));






console.log(value)


//  ...props = ...message