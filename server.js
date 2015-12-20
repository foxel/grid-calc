var express = require('express');
var busboy = require('connect-busboy');
var app = require('./lib/app');
var path = require('path');

var server = express();
server.use(busboy());
server.use(express.static('public_html'));

// set the view engine to ejs
server.set('view engine', 'ejs');

server.get('/help', function (req, res) {
    res.render('pages/help');
});

server.get('/upload', function (req, res) {
    res.render('pages/upload');
});
server.post('/upload', app.upload);

server.get('/download/doc\\d+', app.download);
server.get('/json/doc\\d+', app.json);
server.get('/doc\\d+', function(req, res) {
    res.render('pages/doc', {
        documentId: path.basename(req.url)
    });
});

var instance = server.listen(8080, function () {
    var port = instance.address().port;

    console.log('Listening at port %s', port);
});
