const traverseSample = (babel) => {
	var t = babel.types;
	
	return {
	  visitor: {
		FunctionDeclaration:{
			enter(path) {
				path
					.get('body')
					.unshiftContainer(
					'body',
						t.callExpression(
							t.memberExpression(t.identifier('factory'), t.identifier('consoleprint')),
							[t.stringLiteral(path.node.id.name+ " started.")]
						)
					);
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
