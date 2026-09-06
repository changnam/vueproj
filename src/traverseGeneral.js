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
        sourceType: 'unambiguous'
    });

    // --------------------------------------------------------
    // Maps
    // --------------------------------------------------------

    // Identifier ID -> Parent ID
    const identifierToParent = new Map();

	// AssignmentExpression ID -> Parent ID
    const assignmentToParent = new Map();

    // Node ID -> NodePath
    const nodePathMap = new Map();

    // Actual AST Node -> Node ID
    // WeakMap is useful because the key is the actual object.
    const nodeIdMap = new WeakMap();

    // Actual Identifier Node -> Parent Node
    const identifierParentMap = new WeakMap();
	
	// Actual AssignmentExpression -> Parent Node
    const assignmentParentMap = new WeakMap();


    // --------------------------------------------------------
    // Traverse
    // --------------------------------------------------------

    babel.traverse(ast, {

        enter(path) {

            const node = path.node;

            if (!node) {
                return;
            }


            // ------------------------------------------------
            // Create ID for this node
            // ------------------------------------------------

            const nodeId = getNodeId(node);

            if (nodeId !== null) {

                nodePathMap.set(nodeId, path);

                nodeIdMap.set(node, nodeId);
            }


            // ------------------------------------------------
            // Identifier
            // ------------------------------------------------

            if (t.isIdentifier(node)) {

                cnt++;

                const identifierId = getNodeId(node);

                const parentNode = path.parent;

                const parentId = getNodeId(parentNode);


                // --------------------------------------------
                // Store Identifier -> Parent
                // --------------------------------------------

                identifierToParent.set(
                    identifierId,
                    parentId
                );

                identifierParentMap.set(
                    node,
                    parentNode
                );


                // --------------------------------------------
                // Information
                // --------------------------------------------

                console.log(
                    "\n--------------------------------------------------"
                );

                console.log(
                    "Identifier #" + cnt
                );

                console.log(
                    "name        : " + node.name
                );

                console.log(
                    "node type   : " + node.type
                );

                console.log(
                    "node id     : " + identifierId
                );

                console.log(
                    "hash value  : " + hashcode(node)
                );


                // --------------------------------------------
                // Location
                // --------------------------------------------

                if (node.loc) {

                    console.log(
                        "location    : " +
                        formatLocation(node)
                    );
                }


                // --------------------------------------------
                // Parent
                // --------------------------------------------

                if (parentNode) {

                    console.log(
                        "parent type : " +
                        parentNode.type
                    );

                    console.log(
                        "parent id   : " +
                        parentId
                    );

                    console.log(
                        "parent hash : " +
                        hashcode(parentNode)
                    );

                    if (parentNode.loc) {

                        console.log(
                            "parent loc  : " +
                            formatLocation(parentNode)
                        );
                    }
                }


                // --------------------------------------------
                // Parent Path information
                // --------------------------------------------

                console.log(
                    "path key    : " +
                    path.key
                );

                console.log(
                    "path listKey: " +
                    path.listKey
                );

                console.log(
                    "path type   : " +
                    path.type
                );


                // --------------------------------------------
                // Example:
                //
                // var a = 1;
                //
                // Identifier "a"
                //
                // parent:
                // VariableDeclarator
                //
                // path.key:
                // 0
                // --------------------------------------------

                if (path.parentPath) {

                    console.log(
                        "parent path : " +
                        path.parentPath.type
                    );
                }
            }
			
			// =================================================
            // AssignmentExpression
            // =================================================

            if (t.isAssignmentExpression(node)) {

                const assignmentId = getNodeId(node);

                const parentNode = path.parent;
                const parentId = getNodeId(parentNode);


                // ---------------------------------------------
                // Save AssignmentExpression -> Parent
                // ---------------------------------------------

                assignmentToParent.set(
                    assignmentId,
                    parentId
                );

                assignmentParentMap.set(
                    node,
                    parentNode
                );


                // ---------------------------------------------
                // Print AssignmentExpression
                // ---------------------------------------------

                console.log(
                    "\n=================================================="
                );

                console.log(
                    "AssignmentExpression"
                );

                console.log(
                    "=================================================="
                );

                console.log(
                    "operator    : " + node.operator
                );

                console.log(
                    "node id     : " + assignmentId
                );

                console.log(
                    "hash value  : " + hashcode(node)
                );

                console.log(
                    "location    : " + formatLocation(node)
                );


                // ---------------------------------------------
                // Left side
                // ---------------------------------------------

                console.log(
                    "left type   : " +
                    (node.left ? node.left.type : "null")
                );

                if (t.isIdentifier(node.left)) {

                    console.log(
                        "left name   : " +
                        node.left.name
                    );
                }


                // ---------------------------------------------
                // Right side
                // ---------------------------------------------

                console.log(
                    "right type  : " +
                    (node.right ? node.right.type : "null")
                );

                if (t.isIdentifier(node.right)) {

                    console.log(
                        "right name  : " +
                        node.right.name
                    );
                }


                // ---------------------------------------------
                // Parent
                // ---------------------------------------------

                console.log(
                    "parent type : " +
                    (parentNode ? parentNode.type : "null")
                );

                console.log(
                    "parent id   : " +
                    (parentId || "null")
                );


                // ---------------------------------------------
                // Path information
                // ---------------------------------------------

                console.log(
                    "path key    : " +
                    path.key
                );

                console.log(
                    "path listKey: " +
                    path.listKey
                );

                console.log(
                    "path type   : " +
                    path.type
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


    // --------------------------------------------------------
    // Example: print Identifier -> Parent relationships
    // --------------------------------------------------------

    console.log(
        "\n\n=================================================="
    );

    console.log(
        "Identifier -> Parent relationships"
    );

    console.log(
        "=================================================="
    );


    for (const [identifierId, parentId] of identifierToParent) {

        const identifierPath =
            nodePathMap.get(identifierId);

        const parentPath =
            nodePathMap.get(parentId);


        let identifierName = "unknown";
        let identifierType = "unknown";
        let parentType = "unknown";


        if (identifierPath) {

            identifierName =
                identifierPath.node.name;

            identifierType =
                identifierPath.node.type;
        }


        if (parentPath) {

            parentType =
                parentPath.node.type;
        }


        console.log(
            "Identifier: " +
            identifierName +
            " (" +
            identifierType +
            ")"
        );

        console.log(
            "  identifierId : " +
            identifierId
        );

        console.log(
            "  parentId     : " +
            parentId
        );

        console.log(
            "  parentType   : " +
            parentType
        );

        console.log("");
    }
}


// ============================================================
// Get stable-ish node ID
// ============================================================
//
// This is better than hashing the entire AST node.
//
// Example:
//
// Identifier "a" at line 1, column 4:
//
// Identifier:1:4:1:5
//
// ============================================================

function getNodeId(node) {

    if (!node) {
        return null;
    }

    const loc = node.loc;

    if (!loc) {
        return null;
    }

    return [
        node.type,
        loc.start.line,
        loc.start.column,
        loc.end.line,
        loc.end.column
    ].join(':');
}


// ============================================================
// Numeric hash
// ============================================================
//
// Your original hashcode() function.
//
// NOTE:
// This is NOT guaranteed to be unique.
//
// Two different AST nodes can produce the same hash.
//
// Use getNodeId() when you need an identifier that is much
// less likely to collide within one source file.
// ============================================================

function hashcode(obj) {

    let chars;

    if (typeof obj === 'string') {

        chars = obj;

    } else {

        chars = JSON.stringify(obj)
            .replace(/\{|\}|"|\:|,/g, '');
    }


    let hc = 0;

    for (let i = 0; i < chars.length; i++) {

        hc += chars.charCodeAt(i) * 7;
    }

    return hc;
}


// ============================================================
// Format location
// ============================================================

function formatLocation(node) {

    if (!node || !node.loc) {
        return "unknown";
    }

    return (
        node.loc.start.line +
        ":" +
        node.loc.start.column +
        " - " +
        node.loc.end.line +
        ":" +
        node.loc.end.column
    );
}