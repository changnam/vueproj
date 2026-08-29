const traverseInProgram = {
	CallExpression(path,state){
	
	
	}
}

const traverseTest = (babel) => {
	var t = babel.types;
	return {
		visitor: {
			Program(path,state){
			},
			
			CallExpression(path,state) {
				//console.log("call expression matched.."+path.type + " ast line: " +path.node.loc.start.line);
				//console.log(path.node.callee.property.name);
				//if(path.node.callee.property.name!= null) {
				//  if(path.node.callee.property.name === "RTN_SCREEN_JUMP_WITH_DATA_COND_SEND") {
				//    console.log("jump function matched.."+path.type + " ast line : "+path.node.loc.start.line);
				//  } else if (path.node.callee.property.name === "RTN_SHOW_NORMAL_POPUP_BYINDEX") {
				//    console.log("jump function matched.."+path.type+" ast line : "+path.node.loc.start.line);
				//  }
				//}
				
			var calleeName;
			var fileName = (process.argv[2]).replaceAll("\\","\\\\");
			
			const {scope, node} = path;
			
			const traverseHandler = {
				Identifier(path,state) {
					//console.log("@@@@-------"+path.node.name+" , "+path.parentPath.node.type+","+state.path.node.type+" , path.inList : "+path.inList+"
					//, path.parentPath.inList :"+path.parentPath.inList);
					//const idPath = path;
					const parentCallExpression = path.findParent((path) => path.isCallExpression());
					//const isParentArgument = path.findParent((path) => path.isArgument
					//if(t.isMemberExpression(path.parentPath) && JSON.stringify(path.parentPath.parentPath.node) === JSON.stringify(state.path.node)){
					if(parentCallExpression == state.path && t.isMemberExpression(path.parent) && !path.inList && !path.parentPath.inList) {
						//console.log("########### -------------------- " +path.node.name + " @@@ ");
						memberName = memberName + "."+path.node.name;
						//console.log("$$$$$$$$$$$$$$ "+JSON.stringify(parentCallExpression.node));
					}
				},
			}
			

			if (path.node.callee.type == "Identifier") {
				//console.log(process.argv[2]+","+path.node.callee.name + ","+path.node.loc.start.line);
				calleeName = path.node.callee.name;
			} else if (path.node.callee.type = "MemberExpression") {
				//console.log(process.argv[2]+","+path.node.callee.property.name+","+path.node.loc.start.line);
				//if (path.node.callee.property.type === 'Identifier')
				calleeName = path.node.callee.property.name;
				//calleeName = getName(path.node.callee);
				//else
				//  console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ not identifier"+path.node.callee.property.type);
				
				//state.path = path;
				//console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^ "+state.opts[scope]+"  %%%%% "+ scope);
				//scope.tarverse(node, traverseHandler, this);
				var memberName = "";
				//path.traverse(traverseHandler,{path: path});
				memberName = getName(path.node.callee);
				//console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! memberName: "+memberName);
			}
			const functionArguments = path.node.arguments;
			//console.log("argument numbers: "+functionArguments.length)
			var argumentsString = "";
			for (var i=0;i<functionArguments.length;i++){
				if(t.isIdentifier(functionArguments[i])){
					//console.log("arguments "+i+" : "+functionArguments[i].name);
					argumentsString = argumentsString.concat("!-!").concat(functionArguments[i].name);
				} else if (t.isStringLiteral(functionArguments[i])||t.isBooleanLiteral(functionArguments[i])||t.isNumericLiteral(functionArguments[i])){
					//console.log("arguments "+i+" : "+functionArguments[i].value);
					argumentsString = argumentsString.concat("!-!").concat(functionArguments[i].type);
				} else {
					//console.log("arguments "+i+" : "+functionArguments[i].type);
					argumentsString = argumentsString.concat("!-!").concat(functionArguments[i].type);
				}
			}
			//console.log("@@@@@@@@@@@@@@@@@@@ full arguments : "+argumentsString.substr(1));
			//return;
			argumentsString = argumentsString.replace(/\n/g,"줄바꿈"); // 스트림에 \n 를 줄바꿈으로 치환한다.
			argumentsString = argumentsString.replace(/\\/g,"\\\\"); // 스트림에 \ 를 \\ 로 치환한다. db에 insert 할때 \ 가 들어간다.
			argumentsString = argumentsString.replace(/'/g,"\\'"); // 스트림에 ' 를 \' 로 치환한다. db에 insert 할때 ' 가 들어간다.

			//const parentFunction = path.getFunctionParent();
			// parent path 를 찾음
			const parentFunction = path.findParent((path) => path.isFunctionDeclaration());

			if(parentFunction)
			  //console.log("parent function: "+parentFunction.id +","+parentFunction.node.id.name);
			  //console.log("parent function name: 3 "+parentFunction.type+","+parentFunction.loc.start.line+","+parentFunction.id.type+"
			  //,"+path.node.loc.start.line);
			  console.log("insert into jsfiles (file_path,parent_function,member_name,callee_name,arguments_length,line_num,arguments_value) values('"
			  +fileName+"','"+parentFunction.node.id.name+"','"+memberName+"','"+calleeName+"',"+functionArguments.length+","+node.loc.start.line+",'"
			  +argumentsString.substr(3)+"');");
			 else
				console.log("insert into jsfiles(file_path,parent_function,member_name,callee_name,arguments_length,line_num,arguments_value) values('"
			 +fileName+"','"+"','"+memberName+"','"+calleeName+"',"+functionArguments.length+","+path.node.loc.start.line+",'"+argumentsString.substr(3)+"');");
			 },
			 
			 FunctionDeclaration(path,state){
				var fileName = (process.argv[2]).replaceAll("\\","\\\\");
				var parentFunction;
				
				const functionParams = path.node.params;
				
				//console.log("argument numbers: "+functionArguments.length)
				var parametersString = "";
				for (var i=0;i<functionParams.length;i++){
					if(t.isIdentifier(functionParams[i])){
						//console.log("arguments "+i+" : "+functionArguments[i].name);
						parametersString = parametersString.concat("!-!").concat(functionParams[i].name);
					} else if (t.isStringLiteral(functionParams[i])||t.isBooleanLiteral(functionParams[i])||t.isNumericLiteral(functionParams[i])){
						//console.log("arguments "+i+" : "+functionArguments[i].value);
						parametersString = parametersString.concat("!-!").concat(functionParams[i].type);
					} else {
						//console.log("arguments "+i+" : "+functionArguments[i].type);
						parametersString = parametersString.concat("!-!").concat(functionParams[i].type);
					}
				}
				//console.log("@@@@@@@@@@@@@@@@@@@ full arguments : "+argumentsString.substr(1));
				//return;
				parametersString = parametersString.replace(/\n/g,"줄바꿈"); // 스트림에 \n 를 줄바꿈으로 치환한다.
				parametersString = parametersString.replace(/\\/g,"\\\\"); // 스트림에 \ 를 \\ 로 치환한다. db에 insert 할때 \ 가 들어간다.
				parametersString = parametersString.replace(/'/g,"\\'"); // 스트림에 ' 를 \' 로 치환한다. db에 insert 할때 ' 가 들어간다.
				
				const {node, scope} = path;
				const parentFunctionPath = path.findParent((path) => path.isFunctionDeclaration());
				
				if (parentFunctionPath)
					parentFunction = parentFunctionPath.node.id.name;
				else
					parentFunction = "";
					
				console.log("insert into jsfunctions (file_path,function_name,parent_function,params_length,line_num,parameters) values('"+fileName+"','"+node.id.name
				+"','"+parentFunction+"',"+functionParams.length+","+node.loc.start.line+",'"+parametersString.substr(3)+"');");
			}
		}
	}
}

function getName(node) {
	let name = '';
	
	switch(node.type){
		case 'Identifier':
			name = node.name;
			break;
		case 'MemberExpression':
			name = `${getName(node.object)}.${getName(node.property)}`;
			break;
	}
	
	return name;
}

module.exports = traverseTest;