function walkSync(currentDirPath, callback){
    var fs = require('fs');
    var path = require('path');

    fs.readdirSync(currentDirPath).forEach(function(name){
        var filePath = path.join(currentDirPath,name);
        var stat = fs.statSync(filePath);
        if(stat.isFile()){
            callback(filePath, stat);

        } else if (stat.isDirectory()){
            walkSync(filePath,callback);
        }
    })
}


if (process.argv.length === 3){
    const filename = process.argv[2];
    var fileList = [];

    walkSync(filename, function(filePath, stat){
        //console.log(filePath);
        fileList.push(filePath);
    });
}

fileList.forEach(file => console.log(file));
console.log(fileList.length);