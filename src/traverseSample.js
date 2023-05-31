const traverseSample = (babel) => {
	var t = babel.types;
	
	return {
	  visitor: {
		FunctionDeclaration:{

			enter(path) {
				const code = `
					for( var i =0 ; i<arguments.length; i++){
						if (typeof arguments[i]=== 'string'){
							factory.consoleprint(arguments[i]);
						}
					}
				`;
				path
					.get('body')
					.unshiftContainer(
					'body',
						t.callExpression(
							t.memberExpression(t.identifier('factory'), t.identifier('consoleprint')),
							[t.stringLiteral(path.node.id.name+ " started.")]
						)
					);
					path.get('body').unshiftContainer('body', t.expressionStatement(t.stringLiteral('before')));
					path.get('body').unshiftContainer('body', babel.parse(code).program);
			},
			exit(path) {
			  // check last expression from BlockStatement
			  const blockStatement = path.get('body')
			  const lastExpression = blockStatement.get('body').pop();
			  const timeEndStatement = t.callExpression(
				t.memberExpression(t.identifier('factory'), t.identifier('consoleprint')),
				[t.stringLiteral(path.node.id.name+" ended.")]
			  );

			  if (lastExpression.type !== 'ReturnStatement') {
				lastExpression.insertAfter(timeEndStatement);
			  } else {
				lastExpression.insertBefore(timeEndStatement);
			  }
			}
		},
	  }
	}	
}

module.exports = traverseSample;
