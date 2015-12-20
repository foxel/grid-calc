var App = function($container, documentId) {

    if (!this instanceof App) return new App($container, documentId);

    this.$el = $container;
    this.docId = documentId;
    this.init();
};

App.prototype = {
    init: function() {
        this.$el.delegate('td.data-cell', 'dblclick', _.bind(this.onCellDblClick, this));
    },
    run: function() {
        console.log(this);
        $.when(
            this.loadResource('/json/'+this.docId),
            this.loadTemplate('grid'),
            this.loadTemplate('modal')
        )
        .done(_.bind(function(data, gridTemplate, modalTemplate) {
            this.sheets = data;
            this.gridTemplate = gridTemplate;
            this.modalTemplate = modalTemplate;
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
    onCellDblClick: function (e) {
        e.preventDefault();
        var $el = $(e.currentTarget),
            col = $el.data('col'),
            row = $el.data('row'),
            sheetId = $el.closest('table').data('sheet');
        this.openEditor(sheetId, col, row);
        return false;
    },
    openEditor: function(sheetId, col, row) {
        var sheet = this.sheets[sheetId],
            cell = (sheet.cells[col] && sheet.cells[col][row])
            ? sheet.cells[col][row]
            : {value: '\'', computed: ''};
        var modal = $(this.modalTemplate({
            cell: cell,
            app: this
        })).modal();

        modal.find('.btn-primary').click(_.bind(function() {
            cell.value = this.parseValueInput(modal.find('input[name="value"]').val());
            sheet.cells[col] || (sheet.cells[col] = {});
            sheet.cells[col][row] = cell;
            this.sendUpdate(sheetId, col, row, cell).then(function() {
                modal.modal('hide');
            }, function(e) {
                modal.find('.alert').text(e).show();
                console.log(e);
            });
        }, this));
    },

    sendUpdate: function(sheetId, col, row, cell) {
        return $.post('/update/'+this.docId+'/'+sheetId+'/'+col+row, {
            value: cell.value
        }).then(_.bind(function(data) {
            this.sheets = data;
            this.render();
        }, this), function (response) {
            return response.responseText;
        });
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
        if (String(value).trim() == '') {
            return '';
        } else if (isNaN(value)) {
            return value;
        } else {
            return String(+Number(value).toFixed(8));
        }
    },
    encodeValue: function (value) {
        if (!String(value).trim().length) {
            return '';
        } else if (value[0] == '=') {
            return value;
        } else if (value[0] == '\'') {
            return String(value.substr(1));
        } else {
            return isNaN(value) ? '' : parseFloat(value);
        }
    },
    parseValueInput: function (value) {
        if (value[0] == '=') {
            return value;
        } else {
            return isNaN(value) ? '\''+value : parseFloat(value);
        }
    }
};
