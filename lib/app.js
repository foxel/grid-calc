var fs = require('fs');
var _ = require('underscore');
var libxml = require("libxmljs");
var Promise = require('promise');
var Evaluator = require('./evaluator');

var app = {
    upload: function (req, res) {
        var id = app.prepareId(),
            savePath = './uploads/' + id + '.json',
            tmpPath = './uploads/' + id + '.tmp';

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

        p.then(function() {
            return Promise.denodeify(fs.readFile)(tmpPath);
        })
        .then(function(data) {
            try {
                var doc = libxml.parseXmlString(data, {noblanks: true});
            } catch (e) {
                return Promise.reject('Xml parsing error');
            }

            if (doc.errors.length) {
                return Promise.reject('Xml parsing error');
            }

            var parsed = app.parseXML(doc);

            return Promise.denodeify(fs.writeFile)(savePath, JSON.stringify(parsed));
        })
        .done(
            function () {
                fs.unlink(tmpPath, function (err) {
                    err && console.error(err);
                });
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
    download: function(req, res) {
        var match = req.url.match(/\/(doc\d+)$/);
        var filePath = './uploads/' + match[1] + '.json';

        var p = Promise.denodeify(fs.readFile)(filePath);

        p.then(function(data) {
            var parsed = JSON.parse(data);
            var xml = new libxml.Document();
            var sheetsNode = xml.node('sheets');
            _.each(parsed, function(sheet) {
                var sheetNode = sheetsNode.node('sheet');
                sheetNode.attr({
                    name: sheet.name
                });
                _.each(sheet.cells, function(cells, col) {
                    _.each(cells, function(cell, row) {
                        var cellNode = sheetNode.node('cell');
                        cellNode.attr({
                            col: col,
                            row: row
                        });
                        cellNode.node('displayedValue', app.encodeDisplayed(cell.computed));
                        cellNode.node('value', cell.value);
                    }, this);
                }, this);
            }, this);

            return xml.toString();
        })
        .done(
            function (xml) {
                res.set('Content-Type', 'application/xml');
                res.send(xml);
            },
            function (e) {
                console.error(e);
                res.status(500).send(e);
            }
        );

    },
    prepareId: function () {
        return 'doc' + String(Math.round(Math.random() * 10000 + 10000));
    },
    parseXML: function(doc) {
        //noinspection UnnecessaryLocalVariableJS
        var sheets = _.map(doc.find('sheet'), function(sheet) {
            var grid = {};
            _.each(sheet.find('cell'), function(cell) {
                var col = cell.attr('col').value().toUpperCase(),
                    row = cell.attr('row').value();

                if (!grid.hasOwnProperty(col)) {
                    grid[col] = {};
                }
                grid[col][row] = {
                    'value': cell.get('value').text()
                };
            }, this);

            this.evalGrid(grid);

            return {
                'name': sheet.attr('name').value(),
                'cells': grid
            };
        }, this);

        return sheets;
    },
    evalGrid: function(grid) {
        var evaluator = new Evaluator(grid);
        evaluator.eval();
    },
    encodeDisplayed: function (value) {
        if (isNaN(value)) {
            return '\'' + value;
        } else {
            return String(+Number(value).toFixed(8));
        }
    }
};

module.exports = app;
