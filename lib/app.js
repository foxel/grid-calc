var fs = require('fs');
var _ = require('underscore');
var libxml = require("libxmljs");
var Promise = require('promise');

var functions = {
    'sin': function(x) {
        return Math.sin(180.0*x/Math.PI);
    },
    'cos': function(x) {
        return Math.cos(180.0*x/Math.PI);
    },
    'sqrt': Math.sqrt.bind(Math),
    'abs': Math.abs.bind(Math),
    'min': function(xs) {
        if (_.isArray(xs)) {
            return Math.min.apply(Math, xs);
        }
        return Math.min.apply(Math, arguments);
    },
    'max': function(xs) {
        if (_.isArray(xs)) {
            return Math.max.apply(Math, xs);
        }
        return Math.max.apply(Math, arguments);
    },
    'avg': function(xs) {
        return xs;
    },
    'if': function(cond, x, y) {
        return cond ? x : y;
    },
    'concat': function(str1, str2) {
        return String(str1) + String(str2);
    },
    'equals': function (str1, str2) {
        return String(str1) == String(str2);
    },
    'indexof': function (needle, haystack) {
        return String(haystack).indexOf(String(needle));
    },
    'substr': function (string, start, length) {
        return String(string).substr(start, length);
    },
    'replace': function (string, search, replace) {
        return String(string).replace(String(search), String(replace));
    },
    'rand': function() {
        return Math.random();
    },
    'degToRad': function(deg) {
        return Math.PI*deg/180.0;
    },
    'radToDeg': function(rad) {
        return 180.0*rad/Math.PI;
    },
    'floor': Math.floor.bind(Math),
    'ceil': Math.ceil.bind(Math),
    'round': function(x, precision) {
        return +Number(x).toFixed(precision);
    }
};

var functionsRegExp = '\\b(' + _.keys(functions).join('|') + ')\\b';

var columnToIndex = function(col) {
    var zeroCharCode = 'A'.charCodeAt(0),
        letters = col.toUpperCase(),
        sum = 0;

    for (var i = 0; i < letters.length; i++) {
        sum *= 26;
        sum += (letters.charCodeAt(i) - (zeroCharCode - 1));
    }

    return sum;
};

var indexToColumn = function(idx) {
    var zeroCharCode = 'A'.charCodeAt(0),
        digits = '';

    while (idx > 0) {
        var mod = (idx - 1) % 26;
        digits = String.fromCharCode(mod + zeroCharCode) + digits;
        idx = Math.floor((idx - mod) / 26);
    }

    return digits;
};

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
                    displayedValue;

                if (displayedValue = cell.get('displayedValue')) {
                    displayedValue.text(grid[col][row].computed);
                } else {
                    cell.get('value').addPrevSibling(
                        new libxml.Element(doc, 'displayedValue').text(grid[col][row].computed)
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
        var visited = [];
        _.each(grid, function(cells, col) {
            _.each(cells, function (cell, row) {
                cell.computed = this.evalCell(visited, grid, col, row);
            }, this);
        }, this);
    },
    evalCell: function (visited, grid, col, row) {
        var addr = col + row,
            cell = grid[col][row];

        if (cell.hasOwnProperty('computed')) {
            return cell.computed;
        }
        if (_.contains(visited, addr)) {
            throw 'Circular dependency detected';
        }

        visited.push(addr);

        if (cell.value[0] == '=') {
            cell.computed = this.evalFormula(visited, cell.value.substr(1), grid)
        } else if (cell.value[0] == '\'') {
            cell.computed = String(cell.value.substr(1));
        } else {
            cell.computed = parseFloat(cell.value);
        }

        return cell.computed;
    },
    evalFormula: function(visited, formula, grid) {
        formula = formula
            .replace(new RegExp(functionsRegExp, 'ig'), function (fn) {
                return fn.toLowerCase();
            }.bind(this))
            .replace(/([A-Z]{1,4})([0-9]{1,7}):([A-Z]{1,4})([0-9]{1,7})/ig, function(addr, col1, row1, col2, row2) {
                var data = [],
                    col, row;
                for (col = columnToIndex(col1); col <= columnToIndex(col2); col++) {
                    for (row = row1; row <= row2; row++) {
                        data.push(this.evalCell(visited, grid, indexToColumn(col), row));
                    }
                }
                return JSON.stringify(data);
            }.bind(this))
            .replace(/([A-Z]{1,4})([0-9]{1,7})/ig, function(addr, col, row) {
                return JSON.stringify(this.evalCell(visited, grid, col.toUpperCase(), row));
            }.bind(this))
            ;

        console.log(formula);
        try {
            //noinspection WithStatementJS
            with (functions) {
                var res = eval(formula);
                if (!isNaN(res)) {
                    res = +Number(res).toFixed(8);
                }
                return res;
            }
        } catch (e) {
            console.log(e);
            return '';
        }
    }
};

module.exports = app;
