const fs = require('fs');
const babel = require('@babel/core');
const syntaxJsx = require('@babel/plugin-syntax-jsx')

if (process.argv.length === 3){
	const filename = process.argv[2];
	console.log(filename);
	
	const source = fs.readFileSync(filename).toString();
	console.log(source);
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