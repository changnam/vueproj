const fs = require('fs');
const babel = require('@babel/core');

const t = babel.types;

let cnt = 0;

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------

if (process.argv.length === 3) {

    const filename = process.argv[2];

    console.log(
        "@@@@@@@@@@@@@@@@@@@@@@ processing... " + filename
    );

    const source = fs.readFileSync(filename, 'utf8');

    const ast = babel.parseSync(source, {
 		parserOpts: {
			sourceType: "script",
			comments: false,
			strictMode: false
		} 
    });
			
	const functionBlocks = new Map();
	
    // --------------------------------------------------------
    // Traverse
    // --------------------------------------------------------

    babel.traverse(ast, {

        enter(path) {

            const node = path.node;

            if (!node) {
                return;
            }

			// ==================================================
            // Program
            // ==================================================

            if (t.isProgram(node)) {
				cnt++;
                const functionName = "<global>";

                const blockInfo = {
                    type: "Program",
                    line: node.loc ? node.loc.start.line : 0,
                    column: node.loc ? node.loc.start.column : 0,
                    expressionCount: 0,
                    variableDeclarationCount: 0
                };


                for (const stmtPath of path.get("body")) {

                    if (stmtPath.isExpressionStatement()) {
                        blockInfo.expressionCount++;
                    }

                    if (stmtPath.isVariableDeclaration()) {
                        blockInfo.variableDeclarationCount++;
                    }
                }


                addBlock(
                    functionBlocks,
                    functionName,
                    blockInfo
                );
            }
			
			// ==================================================
            // BlockStatement
            // ==================================================

            if (t.isBlockStatement(node)) {

                let expressionCount = 0;
                let variableDeclarationCount = 0;


                // ----------------------------------------------
                // Count direct statements in this block
                // ----------------------------------------------

                for (const stmtPath of path.get("body")) {

                    if (stmtPath.isExpressionStatement()) {
                        expressionCount++;
                    }

                    if (stmtPath.isVariableDeclaration()) {
                        variableDeclarationCount++;
                    }
                }


                // ----------------------------------------------
                // Find outer function
                // ----------------------------------------------

                const functionPath =
                    path.getFunctionParent();


                let functionName = "<global>";


                if (functionPath) {

                    functionName =
                        getFunctionName(functionPath);
                }


                // ----------------------------------------------
                // Block information
                // ----------------------------------------------

                const blockInfo = {

                    type: "BlockStatement",

                    line: node.loc
                        ? node.loc.start.line
                        : 0,

                    column: node.loc
                        ? node.loc.start.column
                        : 0,

                    expressionCount:
                        expressionCount,

                    variableDeclarationCount:
                        variableDeclarationCount
                };


                // ----------------------------------------------
                // Add to function group
                // ----------------------------------------------

                addBlock(
                    functionBlocks,
                    functionName,
                    blockInfo
                );
            }
        },

        exit(path) {

            // Optional
            // console.log(
            //     "Exit " + path.type
            // );
        }
    });
	
	// ========================================================
    // Sort blocks by source line
    // ========================================================

    for (const blocks of functionBlocks.values()) {

        blocks.sort((a, b) => {

            if (a.line !== b.line) {
                return a.line - b.line;
            }

            return a.column - b.column;
        });
    }


    // ========================================================
    // Print grouped result
    // ========================================================

    console.log(
        "\n\n=================================================="
    );

    console.log(
        "BLOCKS GROUPED BY FUNCTION"
    );

    console.log(
        "=================================================="
    );


    for (const [functionName, blocks] of functionBlocks) {

        console.log(
            "\n--------------------------------------------------"
        );

        console.log(
            "Function: " + functionName
        );

        console.log(
            "Block count: " + blocks.length
        );

        console.log(
            "--------------------------------------------------"
        );


        let blockNo = 1;


        for (const block of blocks) {

            console.log(
                `Block ${blockNo++} ` +
                `line ${block.line} -> ` +
                `${block.expressionCount} ExpressionStatement, ` +
                `${block.variableDeclarationCount} VariableDeclaration`
            );
        }
    }
}

// ============================================================
// Add block to function group
// ============================================================

function addBlock(functionBlocks, functionName, blockInfo) {

    if (!functionBlocks.has(functionName)) {

        functionBlocks.set(
            functionName,
            []
        );
    }

    functionBlocks
        .get(functionName)
        .push(blockInfo);
}

// ============================================================
// Get function name
// ============================================================

function getFunctionName(functionPath) {

    const node = functionPath.node;


    // ========================================================
    // FunctionDeclaration
    // ========================================================

    if (functionPath.isFunctionDeclaration()) {

        return node.id
            ? node.id.name
            : "<anonymous>";
    }


    // ========================================================
    // FunctionExpression
    // ========================================================

    if (functionPath.isFunctionExpression()) {

        const parent = functionPath.parentPath;


        // var test = function() {}
        // let test = function() {}
        // const test = function() {}

        if (
            parent.isVariableDeclarator() &&
            t.isIdentifier(parent.node.id)
        ) {
            return parent.node.id.name;
        }


        // {
        //     test: function() {}
        // }

        if (
            parent.isObjectProperty() &&
            t.isIdentifier(parent.node.key)
        ) {
            return parent.node.key.name;
        }


        return "<anonymous>";
    }


    // ========================================================
    // ArrowFunctionExpression
    // ========================================================

    if (functionPath.isArrowFunctionExpression()) {

        const parent = functionPath.parentPath;


        // const test = () => {}
        // let test = () => {}

        if (
            parent.isVariableDeclarator() &&
            t.isIdentifier(parent.node.id)
        ) {
            return parent.node.id.name;
        }


        // {
        //     test: () => {}
        // }

        if (
            parent.isObjectProperty() &&
            t.isIdentifier(parent.node.key)
        ) {
            return parent.node.key.name;
        }


        return "<anonymous>";
    }


    return "<anonymous>";
}