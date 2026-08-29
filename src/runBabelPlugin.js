const fs = require('fs');
const babel = require('@babel/core');
const iconv = require('iconv-lite');

//const removeDebuggerStatement = require('./removeDebuggerStatement');
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

const traverseTest = require('./traverseTest');
const traverseSample = require('./traverseSample');
const callee_name = require('./callee_name');

if (process.argv.length === 3) {
	const filename = process.argv[2];
	
	//let source = fs.readFileSync(filename).toString();
	//console.log("filename: "+filename);
	const content = fs.readFileSync(filename);
	let source = iconv.decode(content, "euc-kr");
	
	// Remove earlier duplicate function declarations
	source = removeFirstDuplicateFunctions(source);

	const output = babel.transformSync(source, {
		plugins:[
		 [traverseTest,{scope: "testval"}]
		 //[callee_name,{scope: "testval"}]
		 //[traverseSample,{scope: "testval"}]
		],
		parserOpts: {
			sourceType: "script",
			strictMode: false
		}
	}).code;
	
	//fs.writeFileSync(`${__dirname}/output.js`, output);
	//fs.writeFileSync(filename,output
	//console.log(output);
}