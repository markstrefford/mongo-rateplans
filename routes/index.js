/**
 * Created with JetBrains WebStorm.
 * User: markstrefford
 * Date: 28/09/2013
 * Time: 19:28
 * To change this template use File | Settings | File Templates.
 */

/*
 * GET home page.
 */

exports.index = function(req, res){
    res.render('index', { title: 'mongo-rateplans' });
};