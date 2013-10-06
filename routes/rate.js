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
var addRateRoutes = function (app, rateProvider, ratePlanProvider, channelProvider) {
    app.get('/rates', parseUrlParams, function (req, res) {
        console.log("/rate route");
        // Date calculations
        var sd = moment(req.urlParams.query.sd, 'YYYY-MM-DD');
        var ed = moment(req.urlParams.query.ed, 'YYYY-MM-DD');
        var nd = ed.diff(sd, 'days')
        console.log("Number of days = " + nd);

        // Hotel / occupancy details
        var hid = req.urlParams.query.hid;
        var ad = req.urlParams.query.ad;
        var ch = req.urlParams.query.ch;

        // Determine channel
        var channel = req.urlParams.query.channel;

        var parking = 0;
        rateProvider.getRates(channel, hid, sd, ed, ad, ch, nd, ratePlanProvider, channelProvider, function (error, rates) {
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


RateProvider.prototype.getRates = function (channel, hid, sd, ed, ad, ch, nd, ratePlanProvider, channelProvider, callback) {
    // Get Rateplans based on criteria in query string
    ratePlanProvider.findRatePlans(hid, sd, ed, ad, ch, nd, function (error, rateplans) {
        var rates = [],
            preDiscountRates = [];
        var numGuests = parseInt(ad) + parseInt(ch);

        if (typeof(rateplans.length) == "undefined")
            rateplans = [rateplans];
        console.log("We have rateplans returned...");
        console.log("rateplans.length=" + rateplans.length);

        // Iterate through rateplans and calculate
        for (var i = 0; i < rateplans.length; i++) {
            // TODO - Rework to create a json string here!!
            rateplan = rateplans[i].rateplan;
            console.log("Rateplan[i]=" + JSON.stringify(rateplan));
            var ratePlanId = rateplan.rateplancode;
            var roomPrice = nd * rateplan.rate.basebyguestamts.amountbeforetax;
            var invtype = rateplan.rate.invtypecode;
            var currency = rateplan.rate.currencycode;


            // TODO add in all supplements!!
            var occupancy = rateplan.rate.basebyguestamts.numberofguests;

            // TODO handle offers better?  Use Nools???
            var offers = jPath(rateplan, 'offers') != null ? rateplan.offers : false;

            // start to populate the interim response
            var suppPrice = jPath(rateplan, 'rate.additionalguestamounts.child') != null ? (nd * rateplan.rate.additionalguestamounts.child * ch) : 0;
            preDiscountRates[i] = {
                'ratePlanId' : ratePlanId,
                'roomPrice': roomPrice,
                'suppPrice': suppPrice,
                'invtype': invtype,
                'occupancy': occupancy,
                'currency': currency,
                'offers' : offers
            }

        }

        // Work out applicable discounts now
        for (var i = 0; i < preDiscountRates.length; i++) {
            console.log("Offers:" + preDiscountRates[i].offers.length );
            if ( preDiscountRates[i].offers != null) {
                  console.log("Calculating offers for " + JSON.stringify(preDiscountRates[i].offers));
                  for (var j=0; j < preDiscountRates[i].offers.length; j++ ) {
                      var offer = preDiscountRates[i].offers[j];

                      if ( offer.type == 'freenight' ) {
                          console.log("Found offer freenight");
                          if ( nd == offer.numnights ) {
                              console.log("staying for " + nd + " nights so offer valid!");
                              console.log("pre-offer rate = " + preDiscountRates[i].roomPrice + ", saving = " + rateplan.rate.basebyguestamts.amountbeforetax);
                              preDiscountRates[i].roomPrice -= ( offer.freenights * rateplan.rate.basebyguestamts.amountbeforetax );
                          } else {
                              console.log("freenights - num nights not valid!");
                              preDiscountRates[i].offers = 'false';
                          }
                      }
                      if ( offer.type == 'discount' ) {
                          console.log("Found offer discount");
                          if ( nd = offer.numnights ) {
                              console.log("staying for " + nd + " nights so offer valid!");
                              console.log("pre-offer rate = " + preDiscountRates[i].roomPrice + ", saving = " + (1-offer.discount));
                              preDiscountRates[i].roomPrice *= offer.discount ;
                          } else {
                              console.log("discount - num nights not valid!");
                              preDiscountRates[i].offers = 'false';
                          }
                      }
                  }
              } else {
                console.log("No offers for " + preDiscountRates[i]);
              }
            preDiscountRates[i].totalPrice = preDiscountRates[i].roomPrice + preDiscountRates[i].suppPrice;

        }

        // Now apply channels, user groups and advanced purchase discounts
        channelProvider.getChannel(channel, function (error, channel) {
            console.log("Got channel...");
            for (var i = 0; i < preDiscountRates.length; i++) {
                rates[i] = preDiscountRates[i];
                preDiscountRates[i].flexRate   = preDiscountRates[i].roomPrice * channel.flexiblepurchase + preDiscountRates[i].suppPrice;
                preDiscountRates[i].advRate = preDiscountRates[i].roomPrice * channel.advancedpurchase + preDiscountRates[i].suppPrice;
                console.log("preDiscountRates[" + i + "]=" + JSON.stringify(preDiscountRates[i]));
            }
        });

        // All done!
        rates = preDiscountRates;
        callback(null, rates);
    })
    // TODO - Ensure this returns what is needed (Json??)

}

exports.RateProvider = RateProvider;
exports.addRateRoutes = addRateRoutes;