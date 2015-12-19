var fs = require('fs');
var _ = require('underscore');
var libxml = require("libxmljs");
var Promise = require('promise');
var Evaluator = require('./evaluator');

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

            app.parseXML(doc);

            return Promise.denodeify(fs.writeFile)(savePath, doc.toString());
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

            _.each(sheet.find('cell'), function (cell) {
                var col = cell.attr('col').value().toUpperCase(),
                    row = cell.attr('row').value(),
                    displayedValueNode;

                var displayedValue = this.encodeDisplayed(grid[col][row].computed);

                if (displayedValueNode = cell.get('displayedValue')) {
                    displayedValueNode.text(displayedValue);
                } else {
                    cell.get('value').addPrevSibling(
                        new libxml.Element(doc, 'displayedValue').text(displayedValue)
                    );
                }
            }, this);

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
            return +Number(value).toFixed(8)
        }
    }
};

module.exports = app;
