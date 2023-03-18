const fs = require('fs');
const babel = require('@babel/core');
const generate = require('@babel/generator').default;
const iconv = require('iconv-lite');

//const removeDebuggerStatement = require('./removeDebuggerStatement');
const traverseTest = require('./traverseTest');
const traverseSample = require('./traverseSample');
const callee_name = require('./callee_name');

var t = babel.types;

if (process.argv.length === 3) {
	const filename = process.argv[2];
	
	const source = fs.readFileSync(filename,'utf8');
	console.log("filename: "+filename);
	//fs.writeFileSync(filename,source,{encoding : 'utf8'} );
	//console.log(source.toString());
	//const content = iconv.decode(source,'euc-kr');
	//console.log(content);
	const ast = babel.parse(source);
	//console.log(ast);
	//const {code, map} = generate(ast,{},source);
	//fs.writeFileSync(filename,'\ufeff'+code,{encoding : 'utf8'} );
	
	const output = babel.traverse(ast,{
		enter(path) {
			
			if(t.isFunctionDeclaration(path.node)) {
				path
					.get('body')
					.unshiftContainer(
					'body',
						t.callExpression(
							t.memberExpression(t.identifier('factory'), t.identifier('consoleprint')),
							[t.stringLiteral(filename+": "+path.node.id.name+ " started. ")]
							//[t.stringLiteral(filename+": "+path.node.id.name+ " started. caller : +"+path.node.id.name+".caller.toString().substring(1,30))")]
						)
					);
			}
			
									/*
						t.callExpression(
							t.memberExpression(t.identifier('factory'), t.identifier('consoleprint')),
							[t.binaryExpression('+', t.stringLiteral(filename+": "+path.node.id.name+ " started. caller : "),
							 t.callExpression(t.memberExpression(t.callExpression(t.memberExpression(t.memberExpression(t.identifier(path.node.id.name),t.identifier('caller')),t.identifier('toString')),[]),t.identifier('substring')),[t.NumericLiteral(0),t.NumericLiteral(30)]) )]
							 //t.memberExpression(t.identifier(path.node.id.name),
						//	t.callExpression(t.identifier('test'),[t.stringLiteral("blabla")])]
						)
						//t.memberExpression(t.callExpression(t.memberExpression(t.identifier(path.node.id.name),t.identifier('caller')),t.identifier('toString')),t.identifier('substring')),[t.stringLiteral("1"),t.stringLiteral("30")]))
						*/
						
			if(t.isCallExpression(path.node)){
				//console.log("=============== isCallExpression ");
				if(path.node.callee.property && path.node.callee.property.hasOwnProperty('name') && path.node.callee.property.name === 'loadpopup'){
				 //console.log("====================> "+path.node.callee.property.name );
				 path.insertBefore(t.callExpression(t.memberExpression(t.identifier('factory'), t.identifier('consoleprint')),
							[t.stringLiteral(filename+":  loading popup")]));
				 path.skip();
				}
			}
			
		}
	});
	
	// "+getValue.caller.toString().substring(1,30))"
	//fs.writeFileSync(`${__dirname}/output.js`, output);
	//fs.writeFileSync(filename,output
	const {code, map} = generate(ast,{},source);
	//console.log(code);
	//babel.generate(ast,{},source);
	//console.log(code);
	//const outputEncode = iconv.encode(code,'euc-kr');
	fs.writeFileSync(filename,'\ufeff'+code,{encoding : 'utf8'} );
	
	//fs.writeFileSync(filename,code,{encoding : 'utf8'} );
	//fs.writeFileSync(filename,code );
	
}