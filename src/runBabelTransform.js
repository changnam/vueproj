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
	//
	const content = fs.readFileSync(filename);
	const source = iconv.decode(content, "euc-kr");
	
	//const source = fs.readFileSync(filename,'utf8');
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
			if (t.isProgram(path.node)){
				console.log("@@@@@@@@@@@@@@@@@@@@ Entering Program, start:" +path.node.loc.start.line+",end: "+path.node.loc.end.line);
			}
			
			if(t.isFunctionDeclaration(path.node)) {
				const code = `
					for (var runIndexI=0; runIndexI<arguments.length; runIndexI++) {
						if(typeof arguments[runIndexI] === 'string') {
							SYSLog.log(1,runIndexI + " ===> "+arguments[runIndexI]);
						} else if(typeof arguments[runIndexI] === 'boolean') {
							SYSLog.log(1,runIndexI + " ===> "+arguments[runIndexI].toString());
						} else if(typeof arguments[runIndexI] === 'number') {
							SYSLog.log(1,runIndexI + " ===> "+arguments[runIndexI].toString());
						}
					}
				`;
				//테스트
				const filepath = filename.replace(/\\/g,"\\\\");
				const objscreen = "objscreen.getscreenid()";
				const xDataSet = "xDataSet.getid()";
				const div = "div.getname()";
				const obj = "obj.getname()";
				const val = "val";
				const object = "object.getname()";
				const enable = "enable";
				const ojbTab = "ojbTab.getname()";
				const ojbTabScreen = "ojbTab.getscreenid()";
				const ojbTabCheck = "ojbTab.getobjectkind() == XFD_OBJKIND_SCREEN";
				const objundefinedCheck = "obj.getcontrolkind() == XFD_CTRLKIND_FIELD || obj.getcontrolkind() == XFD_CTRLKIND_MULTILINE || obj.getcontrolkind() == XFD_CTRLKIND_COMBOBOX";
				const objundefined = "obj.isundefined()";
				var codeStart;
				var addFlag = true;
				if (path.node.id.name == "gfn_ds2div" || path.node.id.name == "gfn_ds2div2"){ 
					codeStart = `
						SYSLog.log(1,"${filepath} - ${path.node.id.name} - started. objscreen: "+${objscreen}+",xDataSet: "+${xDataSet}+",div: "+${div});
					`
				} else if (path.node.id.name == "gfn_div2ds"){ 
				    codeStart = `
						if (${ojbTabCheck})
							SYSLog.log(1,"${filepath} - ${path.node.id.name} - started. objscreen: "+${objscreen}+",screen: "+${ojbTabScreen}+",xDataSet: "+${xDataSet});
						else
							SYSLog.log(1,"${filepath} - ${path.node.id.name} - started. objscreen: "+${objscreen}+",div: "+${ojbTab}+",xDataSet: "+${xDataSet});
					`
				} else if (path.node.id.name == "set_value" ){ 
					codeStart = `
						SYSLog.log(1,"${filepath} - ${path.node.id.name} - started. obj: "+${obj}+",val: "+${val});
					`
				} else if (path.node.id.name == "set_enable" ){ 
					codeStart = `
						SYSLog.log(1,"${filepath} - ${path.node.id.name} - started. object: "+${object}+",enable: "+${enable});
					`
				} else if (path.node.id.name == "xdatasetSetUndefined" ){ 
					codeStart = `
					    if (${objundefinedCheck})
							SYSLog.log(1,"${filepath} - ${path.node.id.name} - started. obj: "+${obj}+",xDataSet: "+${xDataSet}+",obj undefined: "+${objundefined});
						else
							SYSLog.log(1,"${filepath} - ${path.node.id.name} - started. obj: "+${obj}+",xDataSet: "+${xDataSet});
					`
				} else if (path.node.id.name == "showDataSetLog" || filepath == "C:\\xFrame\\project\\DSI\\screen\\common_module\\nTreeUtil.js"){ 
					//node replace (함수 replace) undefined 처리를 위함
					//path.replace;
					path.remove();
					console.log("@@@@@@@@@@@@@@@@@@@@ removing showDataSetLog" );
					addFlag = false;
				} else {
					codeStart = `
						SYSLog.log(1,"${filepath} - ${path.node.id.name} - started. ");
					`
				}
				if (addFlag) {
					path.get('body').unshiftContainer('body',babel.parse(code).program);
					path.get('body').unshiftContainer('body',babel.parse(codeStart).program);
				}
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
			
			if(t.isReturnStatement(path.node)){
				console.log("##Entering return statement: "+path.node.loc.start.line + ", end: "+path.node.loc.end.line);
				const filepath = filename.replace(/\\/g,"\\\\");
				let functionNameOfReturn = "anonymous";
				let codeEnd = "";
				const parentFunctionPath = path.getFunctionParent();
				if(parentFunctionPath){
					if(parentFunctionPath.isFunctionDeclaration()){
						functionNameOfReturn = parentFunctionPath.node.id?.name || "anonymous";
					}else if(parentFunctionPath.isFunctionExpression() || parentFunctionPath.isArrowFunctionExpression()){
						const parent = parentFunctionPath.parentPath;
						if(parent.isVariableDeclarator()){
							functionNameOfReturn = parent.node.id.name;
						} else if (parent.isObjectProperty() || parent.isObjectMethod()) {
							functionNameOfReturn = parent.node.key.name;
						} else if (parent.isClassMethod()) {
							functionNameOfReturn = parent.node.key.name;
						}
					}
				}
				
				codeEnd = `
					SYSLog.log(1, "${filepath} - ${functionNameOfReturn} - ended. ${path.node.loc.start.line} return ");
				`
				
				const timeEndStatement = babel.parse(codeEnd).program;
				if(functionNameOfReturn != "anonymous"){
					path.insertBefore(timeEndStatement);
				}
			}
		},
		exit(path){
			if(t.isFunctionDeclaration(path.node)) {
				
				const filepath = filename.replace(/\\/g,"\\\\");
				const objscreen = "objscreen.getscreenid()";
				const xDataSet = "xDataSet.getid()";
				const div = "div.getname()";
				const obj = "obj.getname()";
				const val = "val";
				const object = "object.getname()";
				const enable = "enable";
				const ojbTab = "ojbTab.getname()";
				const ojbTabScreen = "ojbTab.getscreenid()";
				const ojbTabCheck = "ojbTab.getobjectkind() == XFD_OBJKIND_SCREEN";
				var codeEnd;
				if (path.node.id.name == "gfn_ds2div" || path.node.id.name == "gfn_ds2div2"){ 
					codeEnd = `
						SYSLog.log(1,"${filepath} - ${path.node.id.name} - ended. objscreen: "+${objscreen}+",xDataSet: "+${xDataSet}+",div: "+${div});
					`
				} else if (path.node.id.name == "gfn_div2ds"){ 
				    codeEnd = `
						if (${ojbTabCheck})
							SYSLog.log(1,"${filepath} - ${path.node.id.name} - ended. objscreen: "+${objscreen}+",screen: "+${ojbTabScreen}+",xDataSet: "+${xDataSet});
						else
							SYSLog.log(1,"${filepath} - ${path.node.id.name} - ended. objscreen: "+${objscreen}+",div: "+${ojbTab}+",xDataSet: "+${xDataSet});
					`
				} else if (path.node.id.name == "set_value" ){ 
					codeEnd = `
						SYSLog.log(1,"${filepath} - ${path.node.id.name} - ended. obj: "+${obj}+",val: "+${val});
					`
				} else if (path.node.id.name == "set_enable" ){ 
					codeEnd = `
						SYSLog.log(1,"${filepath} - ${path.node.id.name} - ended. object: "+${object}+",enable: "+${enable});
					`
				} else if (path.node.id.name == "xdatasetSetUndefined" ){ 
					codeEnd = `
						SYSLog.log(1,"${filepath} - ${path.node.id.name} - ended. obj: "+${obj}+",xDataSet: "+${xDataSet});
					`
				} else {
					codeEnd = `
						SYSLog.log(1,"${filepath} - ${path.node.id.name} - ended. ");
					`
				}
				
			  // check last expression from BlockStatement
			  const blockStatement = path.get('body')
			  const lastExpression = blockStatement.get('body').pop();
			  //path.get('body').unshiftContainer('body',babel.parse(codeStart).program);
			  const timeEndStatement = babel.parse(codeEnd).program;
			  /*
			  const timeEndStatement = t.callExpression(
								t.memberExpression(t.identifier('factory'), t.identifier('consoleprint')),
								//[t.stringLiteral(filename+": "+path.node.id.name+ " started. ")]
								[t.binaryExpression('+',t.updateExpression('++',t.memberExpression(t.identifier('CCNConst'),t.identifier('cntStep')),true), t.stringLiteral("|-|"+filename+"|-|"+path.node.id.name+ "|-| ended."))]
								//[t.stringLiteral(filename+": "+path.node.id.name+ " started. caller : +"+path.node.id.name+".caller.toString().substring(1,30))")]
								);
				*/
			  if (lastExpression.type !== 'ReturnStatement') {
				lastExpression.insertAfter(timeEndStatement);
			  } else {
				//lastExpression.insertBefore(timeEndStatement);
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