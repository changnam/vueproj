const getFullCalleeName = (path) => {
  let callee = path.get('callee');
  let name = [];
  while (callee.node.type === 'MemberExpression') {
    name.unshift(callee.node.property.name);
    callee = callee.get('object');
  }
  name.unshift(callee.node.name);
  return name.join('.');
}

module.exports = function () {
  return {
    visitor: {
      CallExpression(path) {
        const calleeName = getFullCalleeName(path);
        console.log(`Callee name: ${calleeName}`);
      }
    }
  };
};
