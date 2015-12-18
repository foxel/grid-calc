var fs = require('fs');
var _ = require('underscore');
var libxml = require("libxmljs");
var Promise = require('promise');


var app = {
    upload: function (req, res) {
        var id = app.prepareId(),
            savePath = './uploads/' + id + '.xml',
            tmpPath = savePath + '.tmp';

        var p = new Promise(function(resolve, reject) {
            setTimeout(function () {
                reject('Error handling request: timeout');
            }, 1000);

            req.pipe(req.busboy);
            req.busboy.on('file', function (fieldname, file) {
                var fstream = fs.createWriteStream(tmpPath);
                file.pipe(fstream);
                fstream.on('close', function () {
                    resolve(tmpPath);
                });
                fstream.on('error', function () {
                    reject('Data writing error');
                });
            });
            req.busboy.on('error', function () {
                console.log(arguments);
                reject('Data parsing error');
            })
        });

        p
            .then(function() {
                return Promise.denodeify(fs.readFile)(tmpPath);
            })
            .then(function(data) {
                try {
                    var doc = libxml.parseXmlString(data, {noblanks: true});
                    if (doc.errors.length) {
                        return Promise.reject('Xml parsing error');
                    } else {
                        return Promise.denodeify(fs.rename)(tmpPath, savePath);
                    }
                } catch (e) {
                    return Promise.reject('Xml parsing error');
                }
            })
            .done(
                function () {
                    res.send(id);
                },
                function (e) {
                    console.error(e);
                    fs.unlink(tmpPath, function (err) {
                        err && console.error(err);
                    });
                    res.status(400).send(e);
                }
            );
    },
    prepareId: function () {
        return 'doc' + String(Math.round(Math.random() * 10000 + 10000));
    }
};

module.exports = app;
