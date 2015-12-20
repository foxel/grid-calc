var App = function($container, documentId) {

    if (!this instanceof App) return new App($container, documentId);

    this.$el = $container;
    this.docId = documentId;
};

App.prototype = {
    run: function() {
        console.log(this);
        $.when(
            this.loadResource('/json/'+this.docId),
            this.loadTemplate('grid')
        )
        .done(_.bind(function(data, gridTemplate) {
            this.sheets = data;
            this.gridTemplate = gridTemplate;
            this.render();

        }, this));
    },
    render: function() {
        this.$el.html(this.gridTemplate({
            sheets: this.sheets,
            active: 0,
            app: this
        }));
    },
    loadResource: function(url) {
        return $.get(url).then(function(data) {
            return data;
        });
    },
    loadTemplate: function(name) {
        return this.loadResource('/templates/'+name+'.ejs').then(function(data) {
            return _.template(data);
        });
    },
    columnToIndex: function (col) {
        var zeroCharCode = 'A'.charCodeAt(0),
            letters = col.toUpperCase(),
            sum = 0;

        for (var i = 0; i < letters.length; i++) {
            sum *= 26;
            sum += (letters.charCodeAt(i) - (zeroCharCode - 1));
        }

        return sum;
    },
    indexToColumn: function (idx) {
        var zeroCharCode = 'A'.charCodeAt(0),
            digits = '';

        while (idx > 0) {
            var mod = (idx - 1) % 26;
            digits = String.fromCharCode(mod + zeroCharCode) + digits;
            idx = Math.floor((idx - mod) / 26);
        }

        return digits;
    },
    encodeDisplayed: function (value) {
        if (isNaN(value)) {
            return '\'' + value;
        } else {
            return String(+Number(value).toFixed(8));
        }
    }
};
