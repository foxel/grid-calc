var _ = require('underscore');
var Stats = require('statistics');

var functions = {
    'sin': function (x) {
        return Math.sin(Math.PI * x / 180.0);
    },
    'cos': function (x) {
        return Math.cos(Math.PI * x / 180.0);
    },
    'pow': Math.pow.bind(Math),
    'sqrt': Math.sqrt.bind(Math),
    'abs': Math.abs.bind(Math),
    'min': function (xs) {
        if (_.isArray(xs)) {
            return Math.min.apply(Math, xs);
        }
        return Math.min.apply(Math, arguments);
    },
    'max': function (xs) {
        if (_.isArray(xs)) {
            return Math.max.apply(Math, xs);
        }
        return Math.max.apply(Math, arguments);
    },
    'avg': function (x) {
        var xs = _.isArray(x) ? x : arguments;
        var s = new Stats();
        _.each(xs, s.value.bind(s));
        return s.mean;
    },
    'dev': function (x) {
        var xs = _.isArray(x) ? x : arguments;
        var s = new Stats();
        _.each(xs, s.value.bind(s));
        return s.stdev;
    },
    'if': function (cond, x, y) {
        return cond ? x : y;
    },
    'concat': function (str1, str2) {
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
    'rand': function () {
        return Math.random();
    },
    'degToRad': function (deg) {
        return Math.PI * deg / 180.0;
    },
    'radToDeg': function (rad) {
        return 180.0 * rad / Math.PI;
    },
    'floor': Math.floor.bind(Math),
    'ceil': Math.ceil.bind(Math),
    'round': function (x, precision) {
        return +Number(x).toFixed(precision);
    }
};

var columnToIndex = function (col) {
    var zeroCharCode = 'A'.charCodeAt(0),
        letters = col.toUpperCase(),
        sum = 0;

    for (var i = 0; i < letters.length; i++) {
        sum *= 26;
        sum += (letters.charCodeAt(i) - (zeroCharCode - 1));
    }

    return sum;
};

var indexToColumn = function (idx) {
    var zeroCharCode = 'A'.charCodeAt(0),
        digits = '';

    while (idx > 0) {
        var mod = (idx - 1) % 26;
        digits = String.fromCharCode(mod + zeroCharCode) + digits;
        idx = Math.floor((idx - mod) / 26);
    }

    return digits;
};

var Evaluator = function (grid) {
    this.grid = grid;
    this.visited = [];
    this.parser = require("./parser").parser;
    this.parser.yy = {
        helper: this
    };
};

Evaluator.prototype = {
    eval: function () {
        _.each(this.grid, function (cells, col) {
            _.each(cells, function (cell, row) {
                cell.computed = this.evalCell(col, row);
            }, this);
        }, this);
    },
    evalCell: function (col, row) {
        var addr = col + row,
            cell = this.grid[col][row];

        if (cell.hasOwnProperty('computed')) {
            return cell.computed;
        }
        if (_.contains(this.visited, addr)) {
            throw 'Circular dependency detected';
        }

        this.visited.push(addr);

        if (cell.value[0] == '=') {
            cell.computed = this.evalFormula(cell.value.substr(1))
        } else if (cell.value[0] == '\'') {
            cell.computed = String(cell.value.substr(1));
        } else {
            cell.computed = parseFloat(cell.value);
        }

        return cell.computed;
    },
    evalFormula: function (formula) {
        console.log(formula);
        try {
            return this.parser.parse(formula);
        } catch (e) {
            console.log(e);
            return '';
        }
    },
    cellValue: function (addr) {
        var match = addr.match(/([A-Z]{1,4})([0-9]{1,7})/i);
        if (match) {
            return this.evalCell(match[1].toUpperCase(), match[2])
        }
        throw 'Can not parse addr';
    },
    cellRange: function (addr) {
        var match = addr.match(/([A-Z]{1,4})([0-9]{1,7}):([A-Z]{1,4})([0-9]{1,7})/i);
        if (match) {
            var col1 = match[1], row1 = match[2], col2 = match[3], row2 = match[4],
                data = [],
                col, row;
            for (col = columnToIndex(col1); col <= columnToIndex(col2); col++) {
                for (row = row1; row <= row2; row++) {
                    data.push(this.evalCell(indexToColumn(col), row));
                }
            }
            return data;
        }
        throw 'Can not parse addr';
    },
    callFunction: function (fn, args) {
        return functions[fn.toLowerCase()].apply(functions, args);
    },
    isArray: _.isArray.bind(_)
};


module.exports = Evaluator;
