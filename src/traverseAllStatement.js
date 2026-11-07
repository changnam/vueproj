//CREATE TABLE jsstatements (file_path varchar2(1024),parent_function varchar2(256),statement_type varchar2(256), function_order NUMBER, type_order NUMBER, statement_key clob, key_order NUMBER,child_statements NUMBER, statement_hash varchar2(512),condition_hash varchar2(512), forheader_hash varchar2(512),key_hash varchar2(512),line_num number);
//INSERT INTO jsstatements values('D:\\DBS\\project\\DSI\\screen\\common_module\\CCNFile.js','NtFileExists','ReturnStatement',2,1,'NtFileExists/ReturnStatement/CCNConst.CORE_FTP_MBS.NtFileExists.strFilePath',1,0,'0ace33398d6c2f69','0ace33398d6c2f69','0ace33398d6c2f69',1528);

const fs = require('fs');
const babel = require('@babel/core');
const crypto = require('crypto');

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
	"variable_name"
]);

const normalizeCallFunctions = new Map([
    ["screen.applytranmap", 3],
    ["GFN.SomeFunction", 2],
    ["factory.consoleprint", 1]
]);

const ignoredCalls = new Set([
    "screen_on_size",
	"setcolumnwidth",
    "console.log",
    "SYSLog.log",
    "GFN.initScrSetting",
	"GFN.SetGridResize",
	"GFN.Setcolumnwidth",
    "RXCom.RemoveRows",
	"factory.consoleprint",
	"GFN.SetGridResize"
]);

function normalizeCallTest(node) {
    if (t.isExpressionStatement(node)) {
        node = node.expression;
    }

    if (!t.isCallExpression(node)) {
        console.log("Not a CallExpression:", node.type);
        return;
    }

    const calleeName = getCalleeName(node.callee);
    const maxArgs = normalizeCallFunctions.get(calleeName);

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

    // Handle function calls explicitly
    if (
        t.isCallExpression(node) ||
        t.isOptionalCallExpression(node)
    ) {
        const calleeName = getCalleeName(node.callee);

        let args = node.arguments;

        if (normalizeCallFunctions.has(calleeName)) {
            const maxArgs = normalizeCallFunctions.get(calleeName);

            args = args.slice(0, maxArgs);
        }

        return {
            type: node.type,
            callee: normalizeAst(node.callee),
            arguments: args.map(normalizeAst)
        };
    }

    const result = {};

    for (const key of Object.keys(node).sort()) {
        if (HASH_IGNORED_PROPERTIES.has(key)) {
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
    const normalized = normalizeAst(node);
    const json = JSON.stringify(normalized);

    console.log("NORMALIZED AST:");
    console.log(json);

    console.log("HASH:");

    const hash = crypto
        .createHash("sha256")
        .update(json)
        .digest("hex")
        .substring(0, 16);

    console.log(hash);

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

function removeIgnoredStatements(node) {
    if (!node || typeof node !== "object") {
        return;
    }

    if (Array.isArray(node)) {
        return;
    }

    // Remove ignored statements from BlockStatement
    if (t.isBlockStatement(node)) {
        node.body = node.body.filter(
            stmt => !shouldIgnoreStatementNode(stmt)
        );
    }

    // Remove ignored statements from SwitchCase
    if (t.isSwitchCase(node)) {
        node.consequent = node.consequent.filter(
            stmt => !shouldIgnoreStatementNode(stmt)
        );
    }

    // Recursively process child nodes
    for (const key of Object.keys(node)) {
        if (HASH_IGNORED_PROPERTIES.has(key)) {
            continue;
        }

        const value = node[key];

        if (Array.isArray(value)) {
            value.forEach(removeIgnoredStatements);
        } else if (value && typeof value === "object") {
            removeIgnoredStatements(value);
        }
    }
}

function shouldIgnoreStatementNode(node) {
    if (!t.isExpressionStatement(node)) {
        return false;
    }

    const expr = node.expression;

    if (t.isCallExpression(expr)) {
        return isIgnoredCall(expr.callee);
    }

    if (
        t.isAssignmentExpression(expr) &&
        t.isCallExpression(expr.right)
    ) {
        return isIgnoredCall(expr.right.callee);
    }

    return false;
}

function shouldIgnoreStatement(stmtPath) {
    return shouldIgnoreStatementNode(stmtPath.node);
}

function isIgnoredCall(callee) {
    const qualifiedName = getCalleeName(callee);
    const functionName = getFunctionNameOnly(callee);

    return ignoredCalls.has(qualifiedName) ||
           ignoredCalls.has(functionName);
}

function getFunctionNameOnly(callee) {
    if (t.isIdentifier(callee)) {
        return callee.name;
    }

    if (t.isMemberExpression(callee)) {
        if (t.isIdentifier(callee.property)) {
            return callee.property.name;
        }

        if (t.isStringLiteral(callee.property)) {
            return callee.property.value;
        }
    }

    return null;
}

function normalizeCallExpression(node) {
    if (!t.isCallExpression(node)) {
        return normalizeAst(node);
    }

    const calleeName = getCalleeName(node.callee);

    // Normalize only selected functions
    if (normalizeCallFunctions.has(calleeName)) {

        return {
            type: "CallExpression",
            callee: normalizeAst(node.callee),
            arguments: node.arguments
                .slice(0, 3)
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

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------

if (process.argv.length === 3) {

    let filename = process.argv[2];

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
	
	filename = filename.replaceAll("\\","\\\\");
	
	const functionKeyRecords = [];
	
	assignStatementKeys(ast);

	babel.traverse(ast, {
		enter(path) {

			if (shouldIgnoreStatement(path)) {
				return;
			}


			if (t.isStatement(path.node)) {
				const line = path.node.loc
                ? path.node.loc.start.line
                : "<unknown>";

				const hash = getStatementHash(path.node);

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
				
				console.log("insert into jsstatements (file_path,parent_function,statement_type,function_name,callee_name,variable_name,function_order,type_order,key_order,child_statements,statement_hash,condition_hash,forheader_hash,key_hash,line_num) values('"
			  +filename+"','"+path.node.fnName+"','"+path.node.type+"',"+sqlValue(path.node.function_name)+","+sqlValue(path.node.callee_name)+","+sqlValue(path.node.variable_name)+","+path.node.functionOrder +","+path.node.typeOrder +","+path.node.keyCount + ","+childStatementCount+","+sqlValue(hash)+","+sqlValue(conditionHash)+","+sqlValue(forHeaderHash)+","+sqlValue(keyHash)+","+line+");");
			
			
			}
		}
	});
	
	for (const record of functionKeyRecords) {
		
		const sql = `
insert INTO jsfunction_keys(file_path,parent_function,function_name,key_hash,line_num,key_string) VALUES(${sqlValue(record.file_path)},${sqlValue(record.parent_function)},${sqlValue(record.function_name)},${sqlValue(record.key_hash)},${record.line_num},${sqlClobValue(record.key_string)});`;	

		console.log(sql);
	}
}