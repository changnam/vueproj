const fs = require('fs');
const babel = require('@babel/core');
const syntaxJsx = require('@babel/plugin-syntax-jsx')

var src = `var a = 1; // pathA, path.key = 0
var b = 2; // pathB, path.key = 1
var c = 3; // pathC, path.key = 2
`;

if (process.argv.length === 3){
	const filename = process.argv[2];
	console.log(filename);
	
	const source = fs.readFileSync(filename).toString();
	//console.log(source);
	
	const ast = babel.parseSync(source, {
		babelrc: false,
		configFile: false,
		ast: true,
		parserOpts: {
				plugins: [],
		},
		filename,
	});
	
	console.log("ast = ",JSON.stringify(ast,null,2));
}