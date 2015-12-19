var _ = require('underscore');
var UglifyJS = require('uglify-js');

var transformer = new UglifyJS.TreeTransformer(function (node, descend) {
    if (node instanceof UglifyJS.AST_Binary && node.operator == '%') {
        var base = node.left.transform(transformer),
            power = node.right.transform(transformer);

        if (base instanceof UglifyJS.AST_Binary) {
            return new UglifyJS.AST_Binary({
                operator: base.operator,
                left: base.left,
                right: new UglifyJS.AST_Binary({
                    operator: '%',
                    left: base.right,
                    right: power
                })
            }).transform(transformer);
        }
        return new UglifyJS.AST_Call({
            expression: new UglifyJS.AST_SymbolRef({name: 'pow'}),
            args: [base, power]
        });
    }

    node = node.clone();
    descend(node, this);
    return node;
});

module.exports = function(statement) {
    var topLevel = UglifyJS.parse(statement.replace(/\^/g, '%'));

    var transformed = topLevel.transform(transformer);

    return transformed.print_to_string({beautify: true});
};
