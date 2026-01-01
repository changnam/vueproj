const fs = require('fs');
const babel = require('@babel/core');
const presetReact = require('@babel/preset-react');
const generate = require('@babel/generator').default;
const iconv = require('iconv-lite');

//const removeDebuggerStatement = require('./removeDebuggerStatement');
const traverseTest = require('./traverseTest');
const traverseSample = require('./traverseSample');
const callee_name = require('./callee_name');

var t = babel.types;
var lvl = 1;
if (process.argv.length === 3) {
	const filename = process.argv[2];
	//
	//const content = fs.readFileSync(filename);
	//const source = iconv.decode(content, "euc-kr");
	
	const source = fs.readFileSync(filename,'utf8');
	console.log("filename: "+filename);
	//fs.writeFileSync(filename,source,{encoding : 'utf8'} );
	//console.log(source.toString());
	//const content = iconv.decode(source,'euc-kr');
	//console.log(content);
	const ast = babel.parse(source,{
			presets: [presetReact], // Apply the preset to parse JSX
		});
	//console.log(ast);
	//const {code, map} = generate(ast,{},source);
	//fs.writeFileSync(filename,'\ufeff'+code,{encoding : 'utf8'} );
	var cnt = 0;
	var counter = 0;
	const output = babel.traverse(ast,{
		enter(path) {
			cnt++;
			console.log(cnt + path.node.type+","+path.node.name);
			if(t.isFunctionDeclaration(path.node)) {
				const code = `
					for (var idxLog=0; idxLog<arguments.length; idxLog++) {
						if(typeof arguments[idxLog] === 'string') {
							log.info(idxLog + " ===> "+arguments[idxLog]);
						} else if(typeof arguments[idxLog] === 'boolean') {
							log.info(idxLog + " ===> "+arguments[idxLog].toString());
						} else if(typeof arguments[idxLog] === 'number') {
							log.info(idxLog + " ===> "+arguments[idxLog].toString());
						}
					}
				`;
				const filepath = filename.replace(/\\/g,"\\\\");
				const counterInc = "counter++";
				const codeStart = `log.info("["+${counterInc}+"] ${filepath} - ${path.node.id.name} started.");`;
				path.get('body').unshiftContainer('body',babel.parse(code).program);
				/*
				path
					.get('body')
					.unshiftContainer(
					'body',
						t.callExpression(
							t.memberExpression(t.identifier('factory'), t.identifier('consoleprint')),
							//[t.stringLiteral(filename+": "+path.node.id.name+ " started. ")]
							[t.binaryExpression('+',t.updateExpression('++',t.memberExpression(t.identifier('CCNConst'),t.identifier('cntStep')),true), t.stringLiteral("|-|"+filename+"|-|"+path.node.id.name+ "|-| started."))]
							//[t.stringLiteral(filename+": "+path.node.id.name+ " started. caller : +"+path.node.id.name+".caller.toString().substring(1,30))")]
						)
					);
				*/
				path.get('body').unshiftContainer('body',babel.parse(codeStart).program);
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
					const parentFunctionPath = path.findParent((path) => path.isVariableDeclaration());
					if(!parentFunctionPath) {
						//console.log("====================> "+path.node.callee.property.name );
						//console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@ not varialbedeclarator "+path.parent.type);
						path.insertBefore(t.callExpression(t.memberExpression(t.identifier('factory'), t.identifier('consoleprint')),
							[t.stringLiteral(filename+":  loading popup")]));
						path.skip();
					} else {
							//console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@ variabledeclarator "+path.parent.type);
							parentFunctionPath.insertBefore(t.callExpression(t.memberExpression(t.identifier('factory'), t.identifier('consoleprint')),
							[t.stringLiteral(filename+":  loading popup")]));
							path.skip();
					}
				}
			}
			
		},
		exit(path){
			cnt--;
			console.log(cnt + path.node.type+","+path.node.name);
			// if(t.isFunctionDeclaration(path.node)) {
			//   // check last expression from BlockStatement
			//   const filepath = filename.replace(/\\/g,"\\\\");
			//   const counter = "CCNConst.cntStep++";
			//   const codeEnd = `CCNLog.traceLog(${lvl}, ${counter} +" ${filepath} - ${path.node.id.name} ended.");`;
				
			//   const blockStatement = path.get('body')
			//   const lastExpression = blockStatement.get('body').pop();
			//   const timeEndStatement = babel.parse(codeEnd).program;
			//   /*
			//   const timeEndStatement = t.callExpression(
			// 					t.memberExpression(t.identifier('factory'), t.identifier('consoleprint')),
			// 					//[t.stringLiteral(filename+": "+path.node.id.name+ " started. ")]
			// 					[t.binaryExpression('+',t.updateExpression('++',t.memberExpression(t.identifier('CCNConst'),t.identifier('cntStep')),true), t.stringLiteral("|-|"+filename+"|-|"+path.node.id.name+ "|-| ended."))]
			// 					//[t.stringLiteral(filename+": "+path.node.id.name+ " started. caller : +"+path.node.id.name+".caller.toString().substring(1,30))")]
			// 					);
			// 	*/
			//   if (lastExpression.type !== 'ReturnStatement') {
			// 	lastExpression.insertAfter(timeEndStatement);
			//   } else {
			// 	lastExpression.insertBefore(timeEndStatement);
			//   }
			// }
        }		
		
	},{"processedFlag" : false});
	
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