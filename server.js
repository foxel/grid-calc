var express = require('express');
var busboy = require('connect-busboy');
var fs = require('fs');
var app = require('./lib/app');

var server = express();
server.use(busboy());

server.get('/help', function (req, res) {
    res.sendFile('./public_html/help.html', {root: '.'});
});

server.post('/upload', app.upload);

server.get('/doc\\d+', function (req, res) {
    res.sendFile('./uploads/' + req.url + '.xml', {root: '.'});
});

var instance = server.listen(8080, function () {
    var port = instance.address().port;

    console.log('Listening at port %s', port);
});
