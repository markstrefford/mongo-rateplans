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

// var cors = require('../common/cors');

var parseUrlParams = function (req, res, next) {
    req.urlParams = url.parse(req.url, true);
    next();
}

var addChannelRoutes = function (app, channelProvider) {
    console.log("Channel routes added");
    app.get('/channels', parseUrlParams, function (req, res) {
        var channel = req.urlParams.query.channel;
        channelProvider.getChannel(channel, function (error, channel) {
            // cors.setHeaders(res);
            res.send(channel);

        })
    })
}

/*
 * Set up channel provider
 */
ChannelProvider = function (host, database, port) {
    this.db = new Db(database, new Server(host, port, {auto_reconnect: true}, {}));
    this.db.open(function () {
    });
};

ChannelProvider.prototype.getCollection = function (callback) {
    console.log("Channel getCollection");
    this.db.collection('channels', function (error, channel_collection) {
        if (error) callback(error);
        else callback(null, channel_collection);
    });
};

ChannelProvider.prototype.getChannel = function (channel, callback) {
    console.log("Channel getChannel");
    this.getCollection(function (error, channel_collection) {
        if (error) callback(error)
        else {
            console.log("Searching for channel " + channel);
            channel_collection.findOne({ 'channel': channel }, function (error, channel) {
                    if (error) callback(error)
                    else callback(null, channel)
                });
        }
    });
};

exports.ChannelProvider = ChannelProvider;
exports.addChannelRoutes = addChannelRoutes;