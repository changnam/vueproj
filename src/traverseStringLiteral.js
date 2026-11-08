//CREATE TABLE literals (file_path varchar2(512), literal varchar2(512), line_num NUMBER);
const fs = require('fs');
const babel = require('@babel/core');

const t = babel.types;

let cnt = 0;

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

	const extractedStrings = [];

	filename = filename.replaceAll("\\","\\\\");
	
	babel.traverse(ast, {
		StringLiteral(path) {
			const value = path.node.value;

			if (/^\/SCREEN\/[A-Z0-9_]+\/[A-Z0-9]+$/.test(value)) {
				extractedStrings.push({
					value,
					line: path.node.loc?.start.line,
					file_path: filename
				});
			}
		}
	});

	for (const record of extractedStrings) {
		
		const sql = `
insert INTO literals(file_path,literal,line_num) VALUES(${sqlValue(record.file_path)},${sqlValue(record.value)},${sqlValue(record.line)});`;	

		console.log(sql);
	}
}
