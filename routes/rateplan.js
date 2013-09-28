/**
 * Created with JetBrains WebStorm.
 * User: markstrefford
 * Date: 28/09/2013
 * Time: 19:14
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

/*
 * Add routes for rate plans
 */
var addRatePlanRoutes = function (app, ratePlanProvider) {
    app.get('/rateplans', parseUrlParams, function (req, res) {
        console.log("/rateplans route");
        var hid = req.urlParams.query.hid;
        var sd =  req.urlParams.query.sd;
        var ed = req.urlParams.query.ed;
        var ad =  req.urlParams.query.ad;
        var ch = req.urlParams.query.ch;

        ratePlanProvider.findRatePlans(hid, sd, ed, ad, ch, function (error, rateplans) {
            // cors.setHeaders(res);
            res.send(rateplans);
        })
    });
}

/*
 * Set up rate plan provider
 */
RatePlanProvider = function (host, database, port) {
    this.db = new Db(database, new Server(host, port, {auto_reconnect: true}, {}));
    this.db.open(function () {
    });
};

RatePlanProvider.prototype.getCollection = function (callback) {
    this.db.collection('rateplans', function (error, rateplan_collection) {
        if (error) callback(error);
        else callback(null, rateplan_collection);
    });
};

RatePlanProvider.prototype.findAll = function (callback) {
    this.getCollection(function (error, rateplan_collection) {
        if (error) callback(error)
        else {
            rateplan_collection.find().toArray(function (error, rateplans) {
                if (error) callback(error)
                else callback(null, rateplans)
            });
        }
    });
};

RatePlanProvider.prototype.findRatePlans = function (hid, sd, ed, ad, ch, callback) {
    this.getCollection(function (error, rateplan_collection) {
        if (error) callback(error)
        else {
            var sdate = sd.split("-");
            var startDate = new Date(sdate[0], sdate[1]-1, sdate[2]);   // new Date(2013, 05, 29);            var sdate = sd.split("-");
            var edate = ed.split("-");
            var endDate = new Date(edate[0], edate[1]-1, edate[2]);   // new Date(2013, 05, 29);
            var numGuests = parseInt(ad) + parseInt(ch);
            console.log("Searching for start date " + startDate + " to end date " + endDate + " for " + numGuests + " guests!");
            rateplan_collection.find({
                'hotelcode':            hid,
                'rateplan.rate.start':  { $lte: startDate },
                'rateplan.rate.end':    { $gte: endDate },
                'rateplan.rate.basebyguestamts.numberofguests': numGuests
            }
            ).toArray(function (error, rateplans) {
                    if (error) callback(error)
                    else callback(null, rateplans)
                });
        }
    });
};

exports.RatePlanProvider = RatePlanProvider;

exports.addRatePlanRoutes = addRatePlanRoutes;

