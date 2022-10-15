function childComponent(...props) {
  console.time("childComponent")
  //caller
  console.log(props);
  console.timeEnd("childComponent")
}

;
const message = "passed from Parent Component";
value = childComponent(...message); //caller
//--------------------------------------------------

function add(...args) {
  console.time("add")
  //console.log(args);
  let total = 0;

  for (const arg of args) {
    total += arg;
  }

  console.timeEnd("add")
  return total;
}

console.log(add(4, 5, 10));
console.log(value); //  ...props = ...message