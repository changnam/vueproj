function inScope(scope, nodename){
	console.log("-- inScope "+scope+" , "+nodename);
	if(!scope || !scope.bindings) return;
	
	let ret = false;
	let cur = scope;
	
	while(cur){
		console.log("in while "+cur);
		ret = cur.bindings[nodename];
		if (cur === scope.parent || ret){
			break;
		}
		cur = scope.parent;
	}
	
	return ret;
}

const traverseInProgram = {
	ObjectExpression (path,state){
		console.log("objectExpression "+path.node.properties.length);
	},
	Identifier(path,state){
		//
	},
	VariableDeclaration(path,state){
		//
	},
	CallExpression(path,state){
		if(path.scope === state.opts.scope){
			if(path.scope.hasBinding(path.node.callee.property.name)){
				console.log("@@@@@@@@@@@@ CallExpression in global area at file : "+process.argv[2]+ " and line "+path.node.loc.start.line);
			}
		}else if (path.node.callee.type === "Identifier"){
			if(path.scope.hasBinding(path.node.callee.name)){
				console.log("@@@@@@@@CallExpression in global area at file : "+process.argv[2]+ " and line "+path.node.loc.start.line);
			}
		}
	}
}

const traverseTest = (babel) => {
	var t = babel.types;
	
	return {
		visitor: {
			CallExpression(path,state){
				if (path.node.callee.type === "Identifier")
					console.log(path.node.callee.name+" case 1 called... at file : "+process.argv[2]+ " and line "+path.node.loc.start.line+ ", state : "+state.scope);
				else 
					console.log(path.node.callee.property.name+" case 2 called... at file : "+process.argv[2]+ " and line "+path.node.loc.start.line+ ", state : "+state.scope);
				//console.log("@@@@@@ "+path.node.name, ","+path.node.type);
				//inScope(path.scope, path.node.name);
				
				// 위의 호출된 함수명 출력하고 바로 return 함. 모든 함수에 대해서 한줄씩 찍히고 끝남 
				//return;
				
				// 현재 path의 자식 노드들에 대해서 traversal 을 하지 않는다.
				//path.skip();
				
				// traverse 자체를 멈춘다.
				//path.stop();
				
				// callee 의 argument 는 배열임 (각 항목은 node type임)
				const functionArguments = path.node.arguments;
				//console.log("argument 갯수 : "+path.node.arguments.length);
				console.log("argument 갯수 : "+functionArguments.length);
				
				return;
				
				const {scope, node } = path;
				
				const traverseHandler = {
					Identifier(path,state){
						console.log("------------------------- "+path.node.name);
					},
					
				}
				
				const parentFunctionPath = path.findParent((path) => path.isFunctionDeclaration());
				//const parentFunction = path.getFunctionParent();
				if(parentFunctionPath)
					console.log("parent function name : "+parentFunction.node.id.name);
				
				scope.traverse(node,traverseHandler,this);
				
			},
			FunctionDeclaration(path,state){
				var fileName = (process.argv[2]).replaceAll("\\","\\\\");
				const {node , scope} = path;
				
				const functionName = path.node.id.name;
				const params = path.node.params;
				
				const parentFunctionPath = path.findParent((path) => path.isFunctionDeclaration());
				var parentFunction;
				
				//const parentFunction = path.getFunctionParent();
				if(parentFunctionPath)
					//console.log("parent function name : "+parentFunction.node.id.name);
					parentFunction = parentFunctionPath.node.id.name;
				else
					parentFunction = "";
				console.log(fileName+","+functionName+","+parentFunction+","+params.length+","+path.node.loc.start.line);
			}
		}
	}
}

module.exports = traverseTest;

				