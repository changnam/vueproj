import babel from '@babel/core';
import fs from 'fs';
import presetReact from '@babel/preset-react';

const code = 'const n = 1';

if (process.argv.length === 3) {
    const filename = process.argv[2];
    const source = fs.readFileSync(filename,'utf8');

    const output = babel.transformSync(code, {
        presets: [presetReact],
        plugins: [[
            // your first babel plugin 😎😎
            function myCustomPlugin() {
            return {
                visitor: {
                Identifier(path,state) {
                    console.log("enter state optio : ",state.opts);
                    // in this example change all the variable `n` to `x`
                    if (path.isIdentifier({ name: 'n' })) {
                    path.node.name = 'x';
                    }
                },
                },
            };
            },{"filename":filename}
        ]],
    });

    console.log(output.code); // 'const x = 1;'
}