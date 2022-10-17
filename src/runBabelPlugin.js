const fs = require('fs');
const babel = require('@babel/core');
//const removeDebuggerStatement = require('./removeDebuggerStatement');
const traverseTest = require('./traverseTest');
const traverseSample = require('./traverseSample');

if (process.argv.length === 3) {
	const filename = process.argv[2];
	
	const source = fs.readFileSync(filename).toString();
	//console.log("filename: "+filename);
	
	const output = babel.transformSync(source, {
		plugins:[
		 [traverseTest,{scope: "testval"}]
		 //[traverseSample,{scope: "testval"}]
		]
	}).code;
	
	//fs.writeFileSync(`${__dirname}/output.js`, output);
	//fs.writeFileSync(filename,output);
}