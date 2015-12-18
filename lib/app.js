var fs = require('fs');

var app = {
    upload: function (req, res) {
        var fstream;
        req.pipe(req.busboy);
        req.busboy.on('file', function (fieldname, file) {
            var id = app.prepareId();
            fstream = fs.createWriteStream('./uploads/' + id + '.xml');
            file.pipe(fstream);
            fstream.on('close', function () {
                console.log("Upload Finished of " + id);
                res.send(id);
            });
        });
    },
    prepareId: function () {
        return 'doc' + String(Math.round(Math.random() * 10000 + 10000));
    }
};

module.exports = app;
