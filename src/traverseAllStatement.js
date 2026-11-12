//CREATE TABLE jsstatements (file_path varchar2(1024),parent_function varchar2(256),statement_type varchar2(256), function_name varchar2(256), callee_name varchar2(256), variable_name varchar2(512),function_order NUMBER, type_order NUMBER, statement_key clob, key_order NUMBER,child_statements NUMBER, statement_hash varchar2(512),condition_hash varchar2(512), forheader_hash varchar2(512),key_hash varchar2(512), line_num number, block_id number, type_order_in_block number);
//CREATE TABLE jsfunction_keys (file_path VARCHAR2(512),parent_function varchar2(512),function_name VARCHAR2(512),statement_hash varchar2(64),key_hash VARCHAR2(64),line_num  NUMBER,key_string  CLOB);

const fs = require('fs');
const babel = require('@babel/core');
const crypto = require('crypto');
//const generateCode = require("@babel/generator").default;

const t = babel.types;

let cnt = 0;

const HASH_IGNORED_PROPERTIES = new Set([
    // Babel metadata
    "start",
    "end",
    "loc",
    "extra",
    "leadingComments",
    "trailingComments",
    "innerComments",
    "comments",

    // Properties added by assignStatementKeys()
    "fnName",
    "functionOrder",
    "keyCount",
    "statementKey",
    "typeOrder",
	"function_name",
	"callee_name",
	"variable_name",
	"blockId", 
	"typeOrderInBlock"
]);

const normalizeCallFunctions = new Map([
    ["settabitemfocus", 1],
	["screen.applytranmap", 3],
    ["GFN.SomeFunction", 2],
    ["factory.consoleprint", 1]
]);

const ignoredCalls = new Set([
    "setrect",
    "screen_on_size",
	"setcolumnwidth",
    "console.log",
    "SYSLog.log",
    "GFN.initScrSetting",
	"GFN.SetGridResize",
	"GFN.Setcolumnwidth",
    "RXCom.RemoveRows",
	"factory.consoleprint",
	"GFN.SetGridResize",
	"TRAN.TranTimer.point"
]);

function getNormalizeArgCount(callee) {
    const qualifiedName = getCalleeName(callee);
    const functionName = getFunctionNameOnly(callee);

    // 1. Qualified name has priority
    if (normalizeCallFunctions.has(qualifiedName)) {
        return normalizeCallFunctions.get(qualifiedName);
    }

    // 2. Function name only
    if (normalizeCallFunctions.has(functionName)) {
        return normalizeCallFunctions.get(functionName);
    }

    return null;
}

function normalizeCallTest(node) {
    if (t.isExpressionStatement(node)) {
        node = node.expression;
    }

    if (!t.isCallExpression(node)) {
        console.log("Not a CallExpression:", node.type);
        return;
    }

    const calleeName = getCalleeName(node.callee);
	const maxArgs = getNormalizeArgCount(node.callee);

    console.log("Callee:", calleeName);
    console.log("Max arguments:", maxArgs);
    console.log("Before:", node.arguments.length);

    const normalized = {
        type: node.type,
        callee: normalizeAst(node.callee),
        arguments: node.arguments
            .slice(0, maxArgs ?? node.arguments.length)
            .map(arg => normalizeAst(arg))
    };

    console.log("After:", normalized.arguments.length);
    console.log(JSON.stringify(normalized, null, 2));
}

function normalizeAst(node) {

    if (node === null || node === undefined) {
        return null;
    }

    if (Array.isArray(node)) {
        return node.map(normalizeAst);
    }

    if (typeof node !== "object") {
        return node;
    }


    // ==================================================
    // Handle function calls explicitly
    // ==================================================

    if (
        t.isCallExpression(node) ||
        t.isOptionalCallExpression(node)
    ) {

        let args = node.arguments || [];


        // --------------------------------------------------
        // Step 1. Ignore ALL null arguments
        // --------------------------------------------------

        args = args.filter(arg =>
            !t.isNullLiteral(arg)
        );


        // --------------------------------------------------
        // Step 2. Apply configured argument normalization
        // --------------------------------------------------

        const maxArgs = getNormalizeArgCount(node.callee);

        if (maxArgs !== null) {
            args = args.slice(0, maxArgs);
        }


        // --------------------------------------------------
        // Step 3. Normalize arguments
        // --------------------------------------------------

        return {
            type: node.type,
            callee: normalizeAst(node.callee),
            arguments: args.map(arg => normalizeAst(arg))
        };
    }


    // ==================================================
    // Handle other AST nodes
    // ==================================================

    const result = {};

    for (const key of Object.keys(node).sort()) {

        if (HASH_IGNORED_PROPERTIES.has(key)) {
            continue;
        }


        // --------------------------------------------------
        // Ignore all parameters of FunctionDeclaration
        // --------------------------------------------------

        if (
            node.type === "FunctionDeclaration" &&
            key === "params"
        ) {
            continue;
        }


        result[key] = normalizeAst(node[key]);
    }

    return result;
}

function getCalleeName(callee) {
    if (t.isIdentifier(callee)) {
        return callee.name;
    }

	//callee 가 factory.consoleprint 또는 factory?.consoleprint 형태인 경우 , fully qualified name 을 리턴함. 이형태가 아니면 null 을 리턴 , 즉 full qualified name 만 지원
    if (
        t.isMemberExpression(callee) ||
        t.isOptionalMemberExpression(callee)
    ) {
        const objectName = getCalleeName(callee.object);

        const propertyName = t.isIdentifier(callee.property)
            ? callee.property.name
            : t.isStringLiteral(callee.property)
                ? callee.property.value
                : null;

        if (objectName && propertyName) {
            return objectName + "." + propertyName;
        }
    }

    return null;
}

function getStatementHash(node) {

    // Clone original AST to avoid modifying the traversal AST
    const clonedNode = t.cloneNode(node, true);

    // Remove ignored function-call statements
    removeIgnoredStatements(clonedNode);

    // Normalize AST
    const normalized = normalizeAst(clonedNode); //HASH_IGNORED_PROPERTIES 를 제거한다.

    const json = JSON.stringify(normalized);
	
    const hash = crypto
        .createHash("sha256")
        .update(json)
        .digest("hex")
        .substring(0, 16);

    // Debug InitScreen
    if (
        t.isFunctionDeclaration(node) &&
        node.id?.name === "on_AprComplete"
    ) {
        console.log("\n========== HASH DEBUG ==========");
        console.log("Function:", node.id.name);
        console.log("JSON length:", json.length);
        console.log("JSON:", json);
        console.log("SHA256:", hash);
        console.log("================================\n");
    }
	
    return hash;
}

function getFunctionName(path) {
    const fn = path.getFunctionParent();

    if (!fn) {
        return "<global>";
    }

    const node = fn.node;

    if (t.isFunctionDeclaration(node) && node.id) {
        return node.id.name;
    }

    if (t.isFunctionExpression(node) && node.id) {
        return node.id.name;
    }

    const parent = fn.parentPath;

    if (
        parent &&
        parent.isVariableDeclarator() &&
        t.isIdentifier(parent.node.id)
    ) {
        return parent.node.id.name;
    }

    return "<anonymous>";
}
function getIdentifiers(node, options = {}) {
    const names = new Set();

    function visit(n, isRoot = false) {
        if (!n || typeof n !== "object") return;

        if (Array.isArray(n)) {
            n.forEach(item => visit(item));
            return;
        }

        if (t.isIdentifier(n)) {
            if (!options.ignoreNames?.has(n.name)) {
                names.add(n.name);
            }
            return;
        }

        for (const [key, value] of Object.entries(n)) {
            if (HASH_IGNORED_PROPERTIES.has(key)) {
                continue;
            }

            visit(value);
        }
    }

    visit(node);

    return [...names].sort();
}

function assignStatementKeys(ast) {
    const keyCounters = new Map();
    const functionCounters = new Map();
    const typeCounters = new Map();
	
    // Block ID management
    const blockIdsByFunction = new Map();
    const blockCountersByFunction = new Map();

    // Statement type order within each block
    const typeOrderInBlockMap = new Map();


    // --------------------------------------------------
    // Find the nearest parent block
    // --------------------------------------------------
    function getParentBlockPath(path) {

        return path.findParent(p =>
            p.isBlockStatement() ||
            p.isSwitchCase() ||
            p.isProgram()
        );
    }

    // --------------------------------------------------
    // Get block ID within the parent function
    // --------------------------------------------------
    function getBlockId(path, functionId) {

        const blockPath = getParentBlockPath(path);

        // Program-level statements use block ID 0
        if (!blockPath || blockPath.isProgram()) {
            return 0;
        }

        let blockIds = blockIdsByFunction.get(functionId);

        if (!blockIds) {
            blockIds = new Map();
            blockIdsByFunction.set(functionId, blockIds);
        }

        // Assign a new ID when this block is first encountered
        if (!blockIds.has(blockPath.node)) {

            const nextId =
                (blockCountersByFunction.get(functionId) || 0) + 1;

            blockCountersByFunction.set(functionId, nextId);

            blockIds.set(blockPath.node, nextId);
        }

        return blockIds.get(blockPath.node);
    }

    // --------------------------------------------------
    // Traverse statements
    // --------------------------------------------------
	babel.traverse(ast, {
        enter(path) {
            const node = path.node;

            if (!t.isStatement(node)) return;

			// IMPORTANT: Ignore before incrementing any counters
            if (shouldIgnoreStatement(path)) {
                return;
            }
			
            const fnPath = path.getFunctionParent();
            const functionId = fnPath ? fnPath.node : ast;

            const fnName = getFunctionName(path);
            const type = node.type;
            const identifiers = getIdentifiers(node).join(".");
			
			// Function declaration name
			node.function_name = getDeclaredFunctionName(node);

			// Function call name
			node.callee_name = getStatementCalleeName(node);

			// VariableDeclaration names
			node.variable_name = getVariableNames(node).join(",");

            // --------------------------------------------
            // 1. Existing unique statement key
            // --------------------------------------------
			node.fnName = `${fnName}`;
			
            const baseKey =
                `${fnName}/${type}/${identifiers || "<none>"}`;

            const keyCount = (keyCounters.get(baseKey) || 0) + 1;
			
			node.keyCount = keyCount;
			
            keyCounters.set(baseKey, keyCount);

            node.statementKey = `${baseKey}`;

            // --------------------------------------------
            // 2. Sequential order in parent function
            // --------------------------------------------
            const functionOrder =
                (functionCounters.get(functionId) || 0) + 1;

            functionCounters.set(functionId, functionOrder);
            node.functionOrder = functionOrder;

            // --------------------------------------------
            // 3. Sequential order by statement type
            //    within parent function
            // --------------------------------------------
            let countersByType = typeCounters.get(functionId);

            if (!countersByType) {
                countersByType = new Map();
                typeCounters.set(functionId, countersByType);
            }

            const typeOrder = (countersByType.get(type) || 0) + 1;

            countersByType.set(type, typeOrder);
            node.typeOrder = typeOrder;
			
            // --------------------------------------------------
            // 4. Block ID
            // --------------------------------------------------

            const blockId = getBlockId(path, functionId);

            node.blockId = blockId;

            // --------------------------------------------------
            // 5. Statement type order within block
            // --------------------------------------------------

            let countersByBlock = typeOrderInBlockMap.get(functionId);

            if (!countersByBlock) {
                countersByBlock = new Map();
                typeOrderInBlockMap.set(functionId, countersByBlock);
            }

            const blockTypeKey = `${blockId}|${type}`;

            const typeOrderInBlock =
                (countersByBlock.get(blockTypeKey) || 0) + 1;

            countersByBlock.set(blockTypeKey, typeOrderInBlock);

            node.typeOrderInBlock = typeOrderInBlock;
	
        }
    });
}

function getChildStatementCount(path) {
    let count = 0;

    path.traverse({
        enter(childPath) {
            // Count only direct child statements.
            if (childPath.parentPath === path) {
                return;
            }

            if (childPath.isStatement()) {
                count++;

                // Do not count statements nested inside this statement.
                childPath.skip();
            }
        }
    });

    return count;
}

function getDirectChildStatementCount(path) {
    const node = path.node;
    let count = 0;

    function countInBlock(block) {
        if (!block || !Array.isArray(block.body)) {
            return;
        }

        count += block.body.filter(
            stmt => t.isStatement(stmt) && !shouldIgnoreStatementNode(stmt)
        ).length;

    }

	// FunctionDeclaration
    if (
        t.isFunctionDeclaration(node) ||
        t.isFunctionExpression(node) ||
        t.isArrowFunctionExpression(node)
    ) {
        countInBlock(node.body);
    } else if (t.isBlockStatement(node)) {
        countInBlock(node);
    } else if (t.isIfStatement(node)) {
        if (t.isBlockStatement(node.consequent)) {
            countInBlock(node.consequent);
        } else if (t.isStatement(node.consequent) && !shouldIgnoreStatementNode(node.consequent)) {
            count++;
        }

        if (t.isBlockStatement(node.alternate)) {
            countInBlock(node.alternate);
        } else if (t.isStatement(node.alternate) && !shouldIgnoreStatementNode(node.alternate)) {
            count++;
        }
    } else if (
        t.isForStatement(node) ||
        t.isForInStatement(node) ||
        t.isForOfStatement(node) ||
        t.isWhileStatement(node) ||
        t.isDoWhileStatement(node) ||
        t.isWithStatement(node)
    ) {
        if (t.isBlockStatement(node.body)) {
            countInBlock(node.body);
        } else if (t.isStatement(node.body) && !shouldIgnoreStatementNode(node.body)) {
            count++;
        }
    } else if (t.isSwitchStatement(node)) {
        for (const switchCase of node.cases) {
            count += switchCase.consequent.filter(
                stmt => t.isStatement(stmt) && !shouldIgnoreStatementNode(stmt)
            ).length;
        }
    } else if (t.isTryStatement(node)) {
            countInBlock(node.block);

			if (node.handler) {
				countInBlock(node.handler.body);
			}

			if (node.finalizer) {
				countInBlock(node.finalizer);
			}
    }

    return count;
}
function getLoopHeaderHash(node) {
	//console.log("#################################################################################################");
    if (t.isForStatement(node)) {
		//debugForHeader(node);
		//console.log("HASH:", getForHeaderHash(node));
        return getForHeaderHash(node);
    }

    if (t.isForInStatement(node) || t.isForOfStatement(node)) {
        return getForInHeaderHash(node);
    }

    return null;
}

function debugForHeader(node) {
    console.log("INIT:");
    console.log(JSON.stringify(normalizeAst(node.init), null, 2));

    console.log("TEST:");
    console.log(JSON.stringify(normalizeAst(node.test), null, 2));

    console.log("UPDATE:");
    console.log(JSON.stringify(normalizeAst(node.update), null, 2));

    console.log("BODY TYPE:", node.body.type);
}

function getForHeaderHash(node) {
    if (!t.isForStatement(node)) {
        return null;
    }

    const header = {
        init: normalizeAst(node.init),
        test: normalizeAst(node.test),
        update: normalizeAst(node.update)
    };

    return crypto
        .createHash("sha256")
        .update(JSON.stringify(header))
        .digest("hex")
        .substring(0, 16);
}

function getForInHeaderHash(node) {
    if (!t.isForInStatement(node) &&
        !t.isForOfStatement(node)) {
        return null;
    }

    const header = normalizeAst({
        left: node.left,
        right: node.right
    });

    return crypto
        .createHash("sha256")
        .update(JSON.stringify(header))
        .digest("hex")
        .substring(0, 16);
}


function sqlValue(value) {
    if (value == null || value === "null") {
        return "NULL";
    }

    return "'" + String(value).replace(/'/g, "''") + "'";
}

function getKeyString(node) {
    let keyNode = node;

    if (t.isFunctionDeclaration(node)) {
        keyNode = t.cloneNode(node, true);

        // Remove ignored statements
        removeIgnoredStatements(keyNode.body);

        // Ignore function parameters if required
        keyNode.params = [];
    }

    const identifiers = getIdentifiers(keyNode);

    return identifiers.join(".");
}

function getKeyHash(node) {
    const keyString = getKeyString(node);

    return crypto.createHash("sha256")
        .update(keyString, "utf8")
        .digest("hex");
}

function shouldIgnoreStatementNode(node) {
	// ---------------------------------------
    // Ignore: var nhandel;
    // ---------------------------------------
    if (
        t.isVariableDeclaration(node) &&
        node.kind === "var" &&
        node.declarations.length === 1 &&
        t.isIdentifier(node.declarations[0].id, { name: "nhandel" }) &&
        node.declarations[0].init === null
    ) {
        return true;
    }
	
	//isIgnoredCall 은 callExpression 이므로 무조건 isExpressionStatement 여야 한다. 
    if (!t.isExpressionStatement(node)) {
        return false;
    }

    const expr = node.expression;

    if (t.isCallExpression(expr)) {
		//console.log("calling isIgnoredCall 1 ..");
        return isIgnoredCall(expr.callee);
    }

	// assignment 와 callexpressing 이 합쳐진 경우, m_strToday = factory.getsystemtime("%Y%M%D"); 
    if (
        t.isAssignmentExpression(expr) &&
        t.isCallExpression(expr.right)
    ) {
        //console.log("calling isIgnoredCall 2 ..");
		return isIgnoredCall(expr.right.callee);
    }

    return false;
}

function shouldIgnoreStatement(stmtPath) {
    return shouldIgnoreStatementNode(stmtPath.node);
}

function isIgnoredCall(callee) {
    const qualifiedName = getCalleeName(callee); //qualifiedName 또는 null 값을 갖는다.
    const functionName = getFunctionNameOnly(callee); //factory.consoleprint(), factory?.consoleprint(), consoleprint() 모둔 consoleprint 를 받음

    return ignoredCalls.has(qualifiedName) ||
           ignoredCalls.has(functionName);
}

function getFunctionNameOnly(callee) {
    if (t.isIdentifier(callee)) {
		//console.log("returning callee.name..: "+callee.name);
        return callee.name;
    }

    if (t.isMemberExpression(callee)|| t.isOptionalMemberExpression(callee)) {
        if (t.isIdentifier(callee.property)) {
			//console.log("returning callee.property.name..: "+callee.property.name);
            return callee.property.name;
        }

        if (t.isStringLiteral(callee.property)) {
			//console.log("returning callee.property.value..: "+callee.property.value);
            return callee.property.value;
        }
    }

    return null;
}

function normalizeCallExpression(node) {
    if (!t.isCallExpression(node) && !t.isOptionalCallExpression(node)) {
        return normalizeAst(node);
    }

	// Qualified name is checked first; function name only is fallback.
    const maxArgs = getNormalizeArgCount(node.callee);
	
    if (maxArgs !== null) {
        return {
            type: node.type,
            callee: normalizeAst(node.callee),
            arguments: node.arguments
                .slice(0, maxArgs)
                .map(arg => normalizeAst(arg))
        };
    }

    return normalizeAst(node);
}

function getDeclaredFunctionName(node) {
    if (t.isFunctionDeclaration(node) && node.id) {
        return node.id.name;
    }

    return null;
}

function getStatementCalleeName(node) {
    if (
        t.isExpressionStatement(node) &&
        t.isCallExpression(node.expression)
    ) {
        return getCalleeName(node.expression.callee);
    }

    return null;
}

function getVariableNames(node) {
    if (!t.isVariableDeclaration(node)) {
        return [];
    }

    return node.declarations.map(declaration => {
        return getPatternNames(declaration.id);
    }).flat();
}

function getPatternNames(pattern) {
    if (t.isIdentifier(pattern)) {
        return [pattern.name];
    }

    // var {a, b} = obj;
    if (t.isObjectPattern(pattern)) {
        return pattern.properties.flatMap(property => {
            if (t.isRestElement(property)) {
                return getPatternNames(property.argument);
            }

            return getPatternNames(property.value);
        });
    }

    // var [a, b] = array;
    if (t.isArrayPattern(pattern)) {
        return pattern.elements
            .filter(Boolean)
            .flatMap(getPatternNames);
    }

    // var ...rest = value
    if (t.isRestElement(pattern)) {
        return getPatternNames(pattern.argument);
    }

    // var a = value (AssignmentPattern)
    if (t.isAssignmentPattern(pattern)) {
        return getPatternNames(pattern.left);
    }

    return [];
}

function sqlClobValue(value, maxBytes = 4000) {
    const chunks = [];
    let chunk = "";
    let byteLength = 0;

    for (const char of String(value ?? "")) {
        const charBytes = Buffer.byteLength(char, "utf8");

        if (byteLength + charBytes > maxBytes && chunk.length > 0) {
            chunks.push(chunk);
            chunk = "";
            byteLength = 0;
        }

        chunk += char;
        byteLength += charBytes;
    }

    if (chunk.length > 0 || chunks.length === 0) {
        chunks.push(chunk);
    }

    return chunks
        .map(value => `TO_CLOB(${sqlValue(value)})`)
        .join(" || ");
}

function isIgnoredStatement(node) {

    if (!node) {
        return false;
    }

    if (t.isExpressionStatement(node)) {
        const expr = node.expression;

        if (
            t.isCallExpression(expr) ||
            t.isOptionalCallExpression(expr)
        ) {
            return isIgnoredCall(expr.callee);
        }
    }

    return false;
}

function removeIgnoredStatements(node) {

    if (!node || typeof node !== "object") {
        return;
    }

    // Process arrays of AST nodes
    if (Array.isArray(node)) {
        for (let i = node.length - 1; i >= 0; i--) {

            const item = node[i];

            if (shouldIgnoreStatementNode(item)) {
                //console.log(
                //    "[IGNORED STATEMENT]",
                //    generateCode(item)
                //);

                node.splice(i, 1);
                continue;
            }

            removeIgnoredStatements(item);
        }

        return;
    }

    // Recursively process child nodes
    for (const key of Object.keys(node)) {

        if (HASH_IGNORED_PROPERTIES.has(key)) {
            continue;
        }

        removeIgnoredStatements(node[key]);
    }
}
/*
function assignBlockFlags(ast) {

    function isTargetCall(callNode) {

        const calleeName = getCalleeName(callNode.callee);
        const args = callNode.arguments;

        const isSetScreenSize =
            calleeName &&
            calleeName.split(".").pop() === "SetScreenSize";

        const isCreateImageObject =
            calleeName === "screen.createobject" &&
            args.length > 0 &&
            t.isIdentifier(args[0], {
                name: "XFD_CTRLKIND_IMAGE"
            });

        return isSetScreenSize || isCreateImageObject;
    }

    babel.traverse(ast, {

        BlockStatement(path) {

            let found = false;

            path.traverse({

                // Ignore nested functions
                Function(innerPath) {
                    innerPath.skip();
                },

                CallExpression(callPath) {

                    if (isTargetCall(callPath.node)) {
                        found = true;
                        callPath.stop();
                    }
                },

                OptionalCallExpression(callPath) {

                    if (isTargetCall(callPath.node)) {
                        found = true;
                        callPath.stop();
                    }
                }

            });

            path.node.hasSetScreenSize = found;
        }
    });
}
*/

function assignBlockFlags(ast) {

    function isTargetCall(callNode) {

        const calleeName = getCalleeName(callNode.callee);
        const args = callNode.arguments;

        return (
            calleeName &&
            calleeName.split(".").pop() === "SetScreenSize"
        ) || (
            calleeName === "screen.createobject" &&
            args.length > 0 &&
            t.isIdentifier(args[0], {
                name: "XFD_CTRLKIND_IMAGE"
            })
        );
    }

    function hasTargetCallInDirectStatement(statementPath) {

        let found = false;

        statementPath.traverse({

            // Do not search inside nested blocks.
            BlockStatement(innerPath) {
                innerPath.skip();
            },

            // Do not search inside nested functions.
            Function(innerPath) {
                innerPath.skip();
            },

            CallExpression(callPath) {
                if (isTargetCall(callPath.node)) {
                    found = true;
                    callPath.stop();
                }
            },

            OptionalCallExpression(callPath) {
                if (isTargetCall(callPath.node)) {
                    found = true;
                    callPath.stop();
                }
            }
        });

        return found;
    }

    babel.traverse(ast, {

        BlockStatement(path) {

            let found = false;

            // Inspect each direct child statement.
            for (const statementPath of path.get("body")) {

                if (hasTargetCallInDirectStatement(statementPath)) {
                    found = true;
                    break;
                }
            }

            path.node.hasSetScreenSize = found;
        }
    });
}

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------

if (process.argv.length === 3) {

    let filename = process.argv[2];

    console.log(
        "@@@@@@@@@@@@@@@@@@@@@@ processing... " + filename
    );

    let source = fs.readFileSync(filename, 'utf8');

	// Remove earlier duplicate function declarations
	source = removeFirstDuplicateFunctions(source);
	
    const ast = babel.parseSync(source, {
 		parserOpts: {
			sourceType: "script",
			comments: false,
			strictMode: false
		} 
    });
	
	filename = filename.replaceAll("\\","\\\\");
	
	const functionKeyRecords = [];
	
	// Step 1. Assign block flags
	assignBlockFlags(ast);

	// Step 2. Assign statement keys and block IDs
	assignStatementKeys(ast);

	// Step 3. Generate SQL
	babel.traverse(ast, {
		enter(path) {
			// 모든 path 에 대해서 ignoredCall 에 있는지 검사 , 리턴값이 true 이면 다음 path 로 넘어감
			if (shouldIgnoreStatement(path)) {
				return;
			}


			if (t.isStatement(path.node)) {
				const line = path.node.loc
                ? path.node.loc.start.line
                : "<unknown>";

				const hash = getStatementHash(path.node); // normalize 된 AST 로부터 구하므로 HASH_IGNORED_PROPERTIES , normalizeCallFunctions 모두 적용되어 계산됨. 

				// Hash of the condition AST for IfStatement
				const conditionHash = t.isIfStatement(path.node)
                ? getStatementHash(path.node.test)
                : null;
				
				//if (t.isforstatement(path.node)){
				//	console.log("###############################메인에서##################################################################");
				//}
				
				const forHeaderHash = (t.isForStatement(path.node) || t.isForInStatement(path.node) || t.isForOfStatement(path.node))
				? getLoopHeaderHash(path.node)
				: null;
					 
				const childStatementCount = getDirectChildStatementCount(path);
				
				if (t.isFunctionDeclaration(path.node)) {

					const functionName = path.node.id
						? path.node.id.name
						: null;

					const functionKeyString = getKeyString(path.node);
					const functionKeyHash = getKeyHash(path.node);

					functionKeyRecords.push({
						file_path: filename,
						parent_function: path.node.fnName,
						function_name: functionName,
						statement_hash: hash,
						key_hash: functionKeyHash,
						line_num: line,
						key_string: functionKeyString
					});
				}

				// Generate statement-level hash separately
				const keyHash = getKeyHash(path.node);

				/* console.log(
				    `FileName: ${filename}`,
					`Line: ${line}`,
					`Type: ${path.node.type}`,
					`FunctionOrder: ${path.node.functionOrder}`,
					`TypeOrder: ${path.node.typeOrder}`,
					`Key: ${path.node.statementKey}`,
					`Hash: ${hash}`,
					`ConditionHash: ${conditionHash}`,
					`ForHeaderHash: ${forHeaderHash}`,
					`ChildStatements: ${childStatementCount}`
				); */
				
				console.log("insert into jsstatements (file_path,parent_function,statement_type,function_name,callee_name,variable_name,block_flag,function_order,type_order,block_id,type_order_in_block,key_order,child_statements,statement_hash,condition_hash,forheader_hash,key_hash,line_num) values('"
			+filename+"','"+path.node.fnName+"','"+path.node.type+"',"+sqlValue(path.node.function_name)+","+sqlValue(path.node.callee_name)+","+sqlValue(path.node.variable_name)+","+sqlValue(path.node.hasSetScreenSize)+","+path.node.functionOrder +","+path.node.typeOrder +","+path.node.blockId+","+path.node.typeOrderInBlock+","+path.node.keyCount + ","+childStatementCount+","+sqlValue(hash)+","+sqlValue(conditionHash)+","+sqlValue(forHeaderHash)+","+sqlValue(keyHash)+","+line+");");
			
			
			}
		}
	});
	
	for (const record of functionKeyRecords) {
		
		const sql = `
insert INTO jsfunction_keys(file_path,parent_function,function_name,statement_hash,key_hash,line_num,key_string) VALUES(${sqlValue(record.file_path)},${sqlValue(record.parent_function)},${sqlValue(record.function_name)},${sqlValue(record.statement_hash)},${sqlValue(record.key_hash)},${record.line_num},${sqlClobValue(record.key_string)});`;	

		console.log(sql);
	}
}

function removeFirstDuplicateFunctions(code) {
    const functions = [];
    const length = code.length;

    let i = 0;

    let braceDepth = 0;

    let state = 'NORMAL';

    let quote = null;

    let templateExpressionDepth = 0;


    function isIdentifierStart(ch) {
        if (!ch) {
            return false;
        }

        return /[A-Za-z_$\u0080-\uFFFF]/.test(ch);
    }


    function isIdentifierPart(ch) {
        if (!ch) {
            return false;
        }

        return /[A-Za-z0-9_$\u0080-\uFFFF]/.test(ch);
    }


    function skipWhitespace(pos) {
        while (pos < length && /\s/.test(code[pos])) {
            pos++;
        }

        return pos;
    }


    function readIdentifier(pos) {
        if (!isIdentifierStart(code[pos])) {
            return null;
        }

        const start = pos;

        pos++;

        while (pos < length && isIdentifierPart(code[pos])) {
            pos++;
        }

        return {
            name: code.substring(start, pos),
            start,
            end: pos
        };
    }


    /**
     * Find the matching closing brace.
     *
     * The function body can contain:
     *
     * {
     *     if (x) {
     *     }
     *
     *     const a = "{";
     *
     *     // }
     *
     *     /*
     *        }
     *     *\/
     * }
     */
    function findMatchingBrace(openBrace) {
        let pos = openBrace + 1;
        let depth = 1;

        let localState = 'NORMAL';
        let localQuote = null;

        while (pos < length) {
            const ch = code[pos];
            const next = code[pos + 1];

            if (localState === 'NORMAL') {

                // Single quote
                if (ch === "'") {
                    localState = 'STRING_SINGLE';
                    localQuote = "'";
                    pos++;
                    continue;
                }

                // Double quote
                if (ch === '"') {
                    localState = 'STRING_DOUBLE';
                    localQuote = '"';
                    pos++;
                    continue;
                }

                // Template literal
                if (ch === '`') {
                    localState = 'TEMPLATE';
                    pos++;
                    continue;
                }

                // Line comment
                if (ch === '/' && next === '/') {
                    localState = 'LINE_COMMENT';
                    pos += 2;
                    continue;
                }

                // Block comment
                if (ch === '/' && next === '*') {
                    localState = 'BLOCK_COMMENT';
                    pos += 2;
                    continue;
                }

                if (ch === '{') {
                    depth++;
                    pos++;
                    continue;
                }

                if (ch === '}') {
                    depth--;

                    if (depth === 0) {
                        return pos + 1;
                    }

                    pos++;
                    continue;
                }

                pos++;
                continue;
            }


            if (localState === 'STRING_SINGLE') {
                if (ch === '\\') {
                    pos += 2;
                    continue;
                }

                if (ch === "'") {
                    localState = 'NORMAL';
                }

                pos++;
                continue;
            }


            if (localState === 'STRING_DOUBLE') {
                if (ch === '\\') {
                    pos += 2;
                    continue;
                }

                if (ch === '"') {
                    localState = 'NORMAL';
                }

                pos++;
                continue;
            }


            if (localState === 'TEMPLATE') {
                if (ch === '\\') {
                    pos += 2;
                    continue;
                }

                if (ch === '`') {
                    localState = 'NORMAL';
                    pos++;
                    continue;
                }

                /*
                 * We intentionally don't parse ${...} separately here.
                 *
                 * Braces inside a template literal are ignored until
                 * the closing backtick.
                 */
                pos++;
                continue;
            }


            if (localState === 'LINE_COMMENT') {
                if (ch === '\n' || ch === '\r') {
                    localState = 'NORMAL';
                }

                pos++;
                continue;
            }


            if (localState === 'BLOCK_COMMENT') {
                if (ch === '*' && next === '/') {
                    localState = 'NORMAL';
                    pos += 2;
                    continue;
                }

                pos++;
                continue;
            }
        }

        return -1;
    }


    /**
     * Check whether the word at position is exactly "function".
     */
    function isFunctionKeyword(pos) {
        if (code.substring(pos, pos + 8) !== 'function') {
            return false;
        }

        const before = code[pos - 1];
        const after = code[pos + 8];

        if (before && isIdentifierPart(before)) {
            return false;
        }

        if (after && isIdentifierPart(after)) {
            return false;
        }

        return true;
    }


    while (i < length) {
        const ch = code[i];
        const next = code[i + 1];


        /*
         * NORMAL state
         */
        if (state === 'NORMAL') {

            // Single-line comment
            if (ch === '/' && next === '/') {
                state = 'LINE_COMMENT';
                i += 2;
                continue;
            }


            // Block comment
            if (ch === '/' && next === '*') {
                state = 'BLOCK_COMMENT';
                i += 2;
                continue;
            }


            // String
            if (ch === "'") {
                state = 'STRING_SINGLE';
                quote = "'";
                i++;
                continue;
            }


            if (ch === '"') {
                state = 'STRING_DOUBLE';
                quote = '"';
                i++;
                continue;
            }


            // Template literal
            if (ch === '`') {
                state = 'TEMPLATE';
                i++;
                continue;
            }


            // Track braces
            if (ch === '{') {
                braceDepth++;
                i++;
                continue;
            }


            if (ch === '}') {
                if (braceDepth > 0) {
                    braceDepth--;
                }

                i++;
                continue;
            }


            /*
             * Only search for functions at top level.
             *
             * This means:
             *
             * function foo() {}
             *
             * is detected.
             *
             * But:
             *
             * function outer() {
             *     function foo() {}
             * }
             *
             * does not treat foo() as a top-level function.
             */
            if (braceDepth === 0 && isFunctionKeyword(i)) {

                const functionStart = i;

                let pos = i + 8;

                pos = skipWhitespace(pos);


                /*
                 * Handle:
                 *
                 * function* foo()
                 */
                if (code[pos] === '*') {
                    pos++;

                    pos = skipWhitespace(pos);
                }


                /*
                 * Read function name.
                 */
                const identifier = readIdentifier(pos);

                if (!identifier) {
                    i += 8;
                    continue;
                }


                const functionName = identifier.name;

                pos = identifier.end;

                pos = skipWhitespace(pos);


                /*
                 * Find the opening parenthesis.
                 *
                 * function foo(...)
                 */
                if (code[pos] !== '(') {
                    i += 8;
                    continue;
                }


                /*
                 * Find matching ')'.
                 *
                 * We need this because there could be:
                 *
                 * function foo(a = (1 + 2)) {
                 * }
                 */
                let parenDepth = 0;
                let parameterState = 'NORMAL';

                let parameterEnd = -1;

                while (pos < length) {
                    const c = code[pos];
                    const n = code[pos + 1];


                    if (parameterState === 'NORMAL') {

                        if (c === "'") {
                            parameterState = 'STRING_SINGLE';
                            pos++;
                            continue;
                        }

                        if (c === '"') {
                            parameterState = 'STRING_DOUBLE';
                            pos++;
                            continue;
                        }

                        if (c === '`') {
                            parameterState = 'TEMPLATE';
                            pos++;
                            continue;
                        }

                        if (c === '/' && n === '/') {
                            parameterState = 'LINE_COMMENT';
                            pos += 2;
                            continue;
                        }

                        if (c === '/' && n === '*') {
                            parameterState = 'BLOCK_COMMENT';
                            pos += 2;
                            continue;
                        }

                        if (c === '(') {
                            parenDepth++;
                        }
                        else if (c === ')') {
                            parenDepth--;

                            if (parenDepth === 0) {
                                parameterEnd = pos + 1;
                                break;
                            }
                        }

                        pos++;
                        continue;
                    }


                    if (parameterState === 'STRING_SINGLE') {
                        if (c === '\\') {
                            pos += 2;
                            continue;
                        }

                        if (c === "'") {
                            parameterState = 'NORMAL';
                        }

                        pos++;
                        continue;
                    }


                    if (parameterState === 'STRING_DOUBLE') {
                        if (c === '\\') {
                            pos += 2;
                            continue;
                        }

                        if (c === '"') {
                            parameterState = 'NORMAL';
                        }

                        pos++;
                        continue;
                    }


                    if (parameterState === 'TEMPLATE') {
                        if (c === '\\') {
                            pos += 2;
                            continue;
                        }

                        if (c === '`') {
                            parameterState = 'NORMAL';
                        }

                        pos++;
                        continue;
                    }


                    if (parameterState === 'LINE_COMMENT') {
                        if (c === '\n' || c === '\r') {
                            parameterState = 'NORMAL';
                        }

                        pos++;
                        continue;
                    }


                    if (parameterState === 'BLOCK_COMMENT') {
                        if (c === '*' && n === '/') {
                            parameterState = 'NORMAL';
                            pos += 2;
                            continue;
                        }

                        pos++;
                    }
                }


                if (parameterEnd === -1) {
                    i += 8;
                    continue;
                }


                /*
                 * Find opening { of function body.
                 */
                pos = skipWhitespace(parameterEnd);


                if (code[pos] !== '{') {
                    i += 8;
                    continue;
                }


                const bodyStart = pos;

                const functionEnd = findMatchingBrace(bodyStart);


                if (functionEnd === -1) {
                    /*
                     * Invalid/incomplete function.
                     * Let Babel report the real syntax error.
                     */
                    i += 8;
                    continue;
                }


                functions.push({
                    name: functionName,
                    start: functionStart,
                    end: functionEnd
                });


                /*
                 * Skip entire function.
                 */
                i = functionEnd;

                continue;
            }


            i++;
            continue;
        }


        /*
         * STRING_SINGLE
         */
        if (state === 'STRING_SINGLE') {

            if (ch === '\\') {
                i += 2;
                continue;
            }

            if (ch === quote) {
                state = 'NORMAL';
                quote = null;
            }

            i++;
            continue;
        }


        /*
         * STRING_DOUBLE
         */
        if (state === 'STRING_DOUBLE') {

            if (ch === '\\') {
                i += 2;
                continue;
            }

            if (ch === quote) {
                state = 'NORMAL';
                quote = null;
            }

            i++;
            continue;
        }


        /*
         * TEMPLATE
         */
        if (state === 'TEMPLATE') {

            if (ch === '\\') {
                i += 2;
                continue;
            }

            if (ch === '`') {
                state = 'NORMAL';
            }

            i++;
            continue;
        }


        /*
         * LINE_COMMENT
         */
        if (state === 'LINE_COMMENT') {

            if (ch === '\n' || ch === '\r') {
                state = 'NORMAL';
            }

            i++;
            continue;
        }


        /*
         * BLOCK_COMMENT
         */
        if (state === 'BLOCK_COMMENT') {

            if (ch === '*' && next === '/') {
                state = 'NORMAL';
                i += 2;
                continue;
            }

            i++;
            continue;
        }
    }


    /*
     * Find duplicate function names.
     */
    const functionMap = new Map();

    for (const fn of functions) {

        if (!functionMap.has(fn.name)) {
            functionMap.set(fn.name, []);
        }

        functionMap.get(fn.name).push(fn);
    }


    /*
     * We want to keep the LAST function.
     *
     * Therefore, for:
     *
     * test #1
     * test #2
     * test #3
     *
     * remove #1 and #2.
     */
    const removeRanges = [];

    for (const [name, list] of functionMap) {

        if (list.length <= 1) {
            continue;
        }

        console.log(
            `[duplicate function] ${name}: ${list.length} definitions, keeping the last one`
        );

        for (let j = 0; j < list.length - 1; j++) {
            removeRanges.push({
                start: list[j].start,
                end: list[j].end
            });
        }
    }


    if (removeRanges.length === 0) {
        return code;
    }


    /*
     * Remove from the end of the file toward the beginning.
     *
     * This is important because removing earlier text first
     * would change the indexes of later ranges.
     */
    removeRanges.sort((a, b) => b.start - a.start);


    let result = code;

    for (const range of removeRanges) {
        result =
            result.substring(0, range.start) +
            result.substring(range.end);
    }


    return result;
}