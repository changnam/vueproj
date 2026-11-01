//CREATE TABLE jsstatements (file_path varchar2(1024),parent_function varchar2(256),statement_type varchar2(256), function_order NUMBER, type_order NUMBER, statement_key varchar2(2048), key_order NUMBER,child_statements NUMBER, statement_hash varchar2(512),condition_hash varchar2(512), forheader_hash varchar2(512),line_num number);
//INSERT INTO jsstatements values('D:\\DBS\\project\\DSI\\screen\\common_module\\CCNFile.js','NtFileExists','ReturnStatement',2,1,'NtFileExists/ReturnStatement/CCNConst.CORE_FTP_MBS.NtFileExists.strFilePath',1,0,'0ace33398d6c2f69','0ace33398d6c2f69','0ace33398d6c2f69',1528);

const fs = require('fs');
const babel = require('@babel/core');
const crypto = require('crypto');

const t = babel.types;

let cnt = 0;

function getStatementHash(node) {
    // Clone the AST node so the original AST is not modified.
    const cloned = t.cloneNode(node, true);

    // Remove location and metadata that should not affect the hash.
    function clean(n) {
        if (!n || typeof n !== "object") return;

        delete n.start;
        delete n.end;
        delete n.loc;
        delete n.leadingComments;
        delete n.trailingComments;
        delete n.innerComments;
        delete n.extra;

        for (const value of Object.values(n)) {
            if (Array.isArray(value)) {
                value.forEach(clean);
            } else if (value && typeof value === "object") {
                clean(value);
            }
        }
    }

    clean(cloned);

    const normalized = JSON.stringify(cloned);

    return crypto
        .createHash("sha256")
        .update(normalized)
        .digest("hex")
        .substring(0, 16);
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

function getIdentifiers(node) {
    const names = new Set();

    function visit(n) {
        if (!n || typeof n !== "object") return;

        if (t.isIdentifier(n)) {
            names.add(n.name);
            return;
        }

        // Ignore location and comment metadata.
        for (const [key, value] of Object.entries(n)) {
            if (
                key === "loc" ||
                key === "start" ||
                key === "end" ||
                key === "leadingComments" ||
                key === "trailingComments" ||
                key === "innerComments"
            ) {
                continue;
            }

            if (Array.isArray(value)) {
                value.forEach(visit);
            } else if (value && typeof value === "object") {
                visit(value);
            }
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

            const fnPath = path.getFunctionParent();
            const functionId = fnPath ? fnPath.node : ast;

            const fnName = getFunctionName(path);
            const type = node.type;
            const identifiers = getIdentifiers(node).join(".");

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
            stmt => t.isStatement(stmt)
        ).length;
    }

    if (t.isBlockStatement(node)) {
        countInBlock(node);
    } else if (t.isIfStatement(node)) {
        if (t.isBlockStatement(node.consequent)) {
            countInBlock(node.consequent);
        } else if (t.isStatement(node.consequent)) {
            count++;
        }

        if (t.isBlockStatement(node.alternate)) {
            countInBlock(node.alternate);
        } else if (t.isStatement(node.alternate)) {
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
        } else if (t.isStatement(node.body)) {
            count++;
        }
    } else if (t.isSwitchStatement(node)) {
        for (const switchCase of node.cases) {
            count += switchCase.consequent.filter(
                stmt => t.isStatement(stmt)
            ).length;
        }
    } else if (t.isTryStatement(node)) {
        if (t.isBlockStatement(node.block)) {
            countInBlock(node.block);
        }

        if (node.handler && t.isBlockStatement(node.handler.body)) {
            countInBlock(node.handler.body);
        }

        if (node.finalizer) {
            countInBlock(node.finalizer);
        }
    }

    return count;
}
function getLoopHeaderHash(node) {
    if (t.isForStatement(node)) {
        return getForHeaderHash(node);
    }

    if (t.isForInStatement(node) || t.isForOfStatement(node)) {
        return getForInHeaderHash(node);
    }

    return null;
}

function getLoopHeaderHash(node) {
    if (t.isForStatement(node)) {
        return getForHeaderHash(node);
    }

    if (t.isForInStatement(node) || t.isForOfStatement(node)) {
        return getForInHeaderHash(node);
    }

    return null;
}

function getForHeaderHash(node) {
    if (!t.isForStatement(node)) {
        return null;
    }

    const headerAst = {
        init: node.init,
        test: node.test,
        update: node.update
    };

    return crypto
        .createHash("sha256")
        .update(JSON.stringify(
            JSON.parse(JSON.stringify(headerAst, (key, value) => {
                if ([
                    "start", "end", "loc",
                    "leadingComments", "trailingComments",
                    "innerComments", "extra"
                ].includes(key)) {
                    return undefined;
                }
                return value;
            }))
        ))
        .digest("hex")
        .substring(0, 16);
}

function getForInHeaderHash(node) {
    if (!t.isForInStatement(node)) {
        return null;
    }

    function normalize(n) {
        if (n == null) {
            return null;
        }

        if (Array.isArray(n)) {
            return n.map(normalize);
        }

        if (typeof n !== "object") {
            return n;
        }

        const result = {};

        for (const key of Object.keys(n).sort()) {
            if ([
                "start",
                "end",
                "loc",
                "leadingComments",
                "trailingComments",
                "innerComments",
                "extra"
            ].includes(key)) {
                continue;
            }

            result[key] = normalize(n[key]);
        }

        return result;
    }

    const header = normalize({
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
	
	assignStatementKeys(ast);

	babel.traverse(ast, {
		enter(path) {
			if (t.isStatement(path.node)) {
				const line = path.node.loc
                ? path.node.loc.start.line
                : "<unknown>";

				const hash = getStatementHash(path.node);

				// Hash of the condition AST for IfStatement
				const conditionHash = t.isIfStatement(path.node)
                ? getStatementHash(path.node.test)
                : null;
				
				const forHeaderHash = (t.isForStatement(path.node) || t.isForInStatement(path.node) || t.isForOfStatement(path.node))
				? getLoopHeaderHash(path.node)
				: null;
					 
				const childStatementCount = getDirectChildStatementCount(path);
				
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
				
				console.log("insert into jsstatements (file_path,parent_function,statement_type,function_order,type_order,statement_key,key_order,child_statements,statement_hash,condition_hash,forheader_hash,line_num) values('"
			  +filename+"','"+path.node.fnName+"','"+path.node.type+"',"+path.node.functionOrder +","+path.node.typeOrder + ",'"+ path.node.statementKey+"',"+path.node.keyCount + ","+childStatementCount+","+sqlValue(hash)+","+sqlValue(conditionHash)+","+sqlValue(forHeaderHash)+","+line+");");
			
			
			}
		}
	});
}