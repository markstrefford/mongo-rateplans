/**
 * Created with JetBrains WebStorm.
 * User: markstrefford
 * Date: 28/09/2013
 * Time: 09:37
 * To change this template use File | Settings | File Templates.
 */

var express = require('express');
var app = express()
    , http = require('http')
    , path = require('path')
    , MongoClient = require('mongodb').MongoClient
    , Server = require('mongodb').Server;

app.set('port', process.env.PORT || 3002);

app.get('/hello.txt', function(req, res){
    res.send('Hello World');
});

http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));

});