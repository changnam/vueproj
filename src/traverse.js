const fs = require('fs');
const babel = require('@Babel/core');

var t = babel.types;

var cnt=0;

if (process.argv.length === 3) {
	const filename = process.argv[2];
	console.log("@@@@@@@@@@@@@@@@@@@@@@ processing... "+filename);
	
	const source = fs.readFileSync(filename).toString();
	
	const ast = babel.parseSync(source);
	
	babel.traverse(ast, {
		enter(path){
			console.log("Enter " + cnt++ + " , "+ path.type + " at line : "+path.node.loc.start.line);
		},
		exit(path){
			console.log("Exit "+  path.type + " at line : "+path.node.loc.start.line);
		},
	})
}

