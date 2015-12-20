var express = require('express');
var busboy = require('connect-busboy');
var app = require('./lib/app');

var server = express();
server.use(busboy());

server.get('/help', function (req, res) {
    res.sendFile('./public_html/help.html', {root: '.'});
});

server.post('/upload', app.upload);

server.get('/download/doc\\d+', app.download);
server.get('/json/doc\\d+', app.json);

var instance = server.listen(8080, function () {
    var port = instance.address().port;

    console.log('Listening at port %s', port);
});
