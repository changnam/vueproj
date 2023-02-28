var http = require('http');
var formidable = require('formidable');
var fs = require('fs');

http.createServer(function (req, res) {
  if (req.url == '/uploadFile') {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
	  //for (var prop in files.filetoupload){
	//	  console.log("@@@@@@@@@ "+files.filetoupload[prop]);
	  //}
      var oldpath = files.file.filepath;
      var newpath = 'C:/Users/Chang/' + files.file.originalFilename;
      fs.rename(oldpath, newpath, function (err) {
        if (err) throw err;
		res.setHeader("Content-Type", "text/html");
        res.write('successSaveFileName=stress.csv');
        res.end();
      });
 });
  } else {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write('<form action="uploadFile" method="post" enctype="multipart/form-data">');
    res.write('<input type="file" name="file"><br>');
    res.write('<input type="submit">');
    res.write('</form>');
    return res.end();
  }
}).listen(8080);