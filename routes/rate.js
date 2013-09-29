/**
 * Created with JetBrains WebStorm.
 * User: markstrefford
 * Date: 29/09/2013
 * Time: 08:21
 * To change this template use File | Settings | File Templates.
 */

var url = require('url');
var Db = require('mongodb').Db;
var Connection = require('mongodb').Connection;
var Server = require('mongodb').Server;
var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;
// var cors = require('../common/cors');

var parseUrlParams = function (req, res, next) {
    req.urlParams = url.parse(req.url, true);
    next();
}

var getDateDiff = function(date1, date2) {
    return (date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
}

/*
 * Add routes for rates
 */
var addRateRoutes = function (app, rateProvider, ratePlanProvider) {
    app.get('/rateplans', parseUrlParams, function (req, res) {
        console.log("/rate route");
        var hid = req.urlParams.query.hid;
        var sd =  req.urlParams.query.sd;
        var ed = req.urlParams.query.ed;
        var ad =  req.urlParams.query.ad;
        var ch = req.urlParams.query.ch;
        var nd = getDateDiff(ed, sd);


        ratePlanProvider.findRatePlans(hid, sd, ed, ad, ch, function (error, rates) {
            // cors.setHeaders(res);
            res.send(rates);
        })
    });
}

/*
 * Set up rate provider
 */
RateProvider = function (host, database, port) {
    this.db = new Db(database, new Server(host, port, {auto_reconnect: true}, {}));
    this.db.open(function () {
    });
};

RateProvider.prototype.getCollection = function (callback) {
    this.db.collection('rateplans', function (error, rateplan_collection) {
        if (error) callback(error);
        else callback(null, rateplan_collection);
    });
};


exports.RateProvider = RateProvider;

exports.addRateRoutes = addRateRoutes;