/**
 * Created with JetBrains WebStorm.
 * User: markstrefford
 * Date: 28/09/2013
 * Time: 09:37
 * To change this template use File | Settings | File Templates.
 */

var express = require('express')
    , http = require('http')
    , path = require('path')
    , MongoClient = require('mongodb').MongoClient
    , Server = require('mongodb').Server;

var routes = require('./routes')
var rateplan = require('./routes/rateplan.js')
    , rate = require('./routes/rate.js');

var app = express()
app.set('port', process.env.PORT || 3002);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// Dev / prod config options

app.configure('development', function () {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function () {
    app.use(express.errorHandler());
});

// Set up providers
var ratePlanProvider =  new RatePlanProvider('mongodb.local', 'rateplans', 27017);
var rateProvider =      new RateProvider('mongodb.local', 'rateplans', 27017);

// Set up routes
app.get('/', routes.index);
var ratePlanRoutes =    rateplan.addRatePlanRoutes(app, ratePlanProvider);
var rateRoutes =        rate.addRateRoutes(app, rateProvider, ratePlanProvider);

// Now create the server
http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));

});