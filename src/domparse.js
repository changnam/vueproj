const fs = require('fs');
const babel = require('@babel/core');
const xml2js = require('xml2js');

var filename;

function traverse(){}

if (process.argv.length === 3){
    filename = process.argv[2];

    const source = fs.readFileSync(filename).toString();
    const parser = new xml2js.Parser();
    var xmlsource;

    parser.parseString(source, function(err, result){
        console.log("ast = ", JSON.stringify(result, null, 2))
    })
}