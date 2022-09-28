const fs = require('fs');
const babel = require('@babel/core');

if (process.argv.length === 3){
    const filename = process.argv[2];

    const source = fs.readFileSync(filename).toString();

    const ast = babel.parseSync(source, {
        babelrc: false,
        configFile: false,
        ast: true,
        parserOpts:{
            plugins: [],
        },
        filename,
    });

    console.log("ast = "+JSON.stringify(ast, null, 2))
}