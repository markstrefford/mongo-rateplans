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
var moment = require('moment');
var rateplan = require('./rateplan.js')

// var cors = require('../common/cors');

var parseUrlParams = function (req, res, next) {
    req.urlParams = url.parse(req.url, true);
    next();
}

/*
 * Add routes for rates
 */
var addRateRoutes = function (app, rateProvider, ratePlanProvider) {
    app.get('/rates', parseUrlParams, function (req, res) {
        console.log("/rate route");
        // Date calculations
        var sd = moment(req.urlParams.query.sd, 'YYYY-MM-DD');
        var ed = moment(req.urlParams.query.ed, 'YYYY-MM-DD');
        var nd = ed.diff(sd, 'days')

        var hid = req.urlParams.query.hid;
        var ad = req.urlParams.query.ad;
        var ch = req.urlParams.query.ch;

        var parking = 0;
        rateProvider.getRates(hid, sd, ed, ad, ch, nd, ratePlanProvider, function (error, rates) {
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

/*
 * Calculate rates...
 *
 * 1) Get relevant rateplans from RatePlanProvider.findRatePlans
 * 2) For each rateplan, calculate based on number of nights and number of guests
 * 3) Return the following:  {"roomtype" : room_type_identified, "rate" : calculated_rate}
 *
 */

// Calculate base rates based on occupancy, nights, etc.
var calcBaseRate = function (rateplan, numGuests, nd) {
    var rate = nd * rateplan.rate.basebyguestamts.amountbeforetax * numGuests;
    var invtype = rateplan.rate.invtypecode;
    var currency = rateplan.rate.currencycode;
    return {
        'rate': rate,
        'invtype': invtype,
        'currency': currency
    };
}

// Calculate supplement cost
var calcSuppRate = function (rateplan) {
    // TODO - Work through supplements, so need to pass them in!!!
    return 0;
}

// Apply discounts and return total rate
var applyDiscount = function (rateplan, baseRate, suppRate) {
    // Todo - work out applicable discounts here somehow!!
    return baseRate + suppRate;
}

// Check for JSon object existence
// From stackoverflow/questions/1129209/check-if-json-keys-node-exist
function jPath(obj, a) {
    a = a.split(".");
    var p = obj || {};
    for (var i in a) {
        if (p === null || typeof p[a[i]] === 'undefined') return null;
        p = p[a[i]];
    }
    return p;
}


RateProvider.prototype.getRates = function (hid, sd, ed, ad, ch, nd, ratePlanProvider, callback) {
    ratePlanProvider.findRatePlans(hid, sd, ed, ad, ch, function (error, rateplans) {
        var rates = [],
            supps = [];
        if (typeof(rateplans.length) == "undefined")
            rateplans = [rateplans];
        var numGuests = parseInt(ad) + parseInt(ch);
        console.log("We have rateplans returned...");
        console.log("rateplans.length=" + rateplans.length);
        for (var i = 0; i < rateplans.length; i++) {
            // TODO - Rework to create a json string here!!
            rateplan = rateplans[i].rateplan;
            console.log("Rateplan[i]=" + JSON.stringify(rateplan));
            var roomPrice = nd * rateplan.rate.basebyguestamts.amountbeforetax;
            var invtype = rateplan.rate.invtypecode;
            var currency = rateplan.rate.currencycode;
            var occupancy = rateplan.rate.basebyguestamts.numberofguests;
            // TODO add in all supplements!!
            console.log("typeof(rateplan.rate.additionalguestamounts.child");
            var suppPrice = jPath(rateplan, 'rate.additionalguestamounts.child') != null ? (nd * rateplan.rate.additionalguestamounts.child * ch) : 0;
            rates[i] = {
                'roomPrice': roomPrice,
                'suppPrice': suppPrice,
                'invtype': invtype,
                'occupancy': occupancy,
                'currency': currency
            }
            /*
             var baseRate = calcBaseRate(rateplan, numGuests, nd);
             var suppRate = calcSuppRate(rateplan);
             rates[i] = applyDiscount(rateplan, baseRate, suppRate);
             */

        }
        console.log("rate[]=" + JSON.stringify(rates));
        callback(null, rates);
    })
    // TODO - Ensure this returns what is needed (Json??)

}

exports.RateProvider = RateProvider;

exports.addRateRoutes = addRateRoutes;