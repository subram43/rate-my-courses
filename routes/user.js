var express = require('express');
var router = express.Router();
const MongoClient = require('mongodb').MongoClient;
var dotenv = require('dotenv');
dotenv.config();
const uri = `mongodb+srv://subram43:${process.env.DATABASE_KEY}@maincluster-1u199.azure.mongodb.net/test?retryWrites=true&w=majority`;

/* GET users ratings. */
router.get('/', function(req, res, next) {

    var templateVals = {
        errors: null, 
        loggedIn: true, 
    };

    var errMsg = [{
        msg: 'Server error occured. Please try again.',
        val: 'user'
    }];

    if (!req.user) {
        return res.redirect('/');
    }

    MongoClient.connect(uri, {useUnifiedTopology: true}, function(err, client) {
        if (err) {
            templateVals.ratings = JSON.stringify([]);
            templateVals.errors = JSON.stringify(errMsg);
            client.close();
            return res.render('user', templateVals);
        }

        var db = client.db('app');
        var dbQuery = {
            user: req.user.username
        };
        db.collection('ratings').find(dbQuery).toArray(function(err, result) {
            if (err) {
                templateVals.ratings = JSON.stringify([]);
                templateVals.errors = JSON.stringify(errMsg);
                client.close();
                return res.render('user', templateVals);
            }

            templateVals.ratings = JSON.stringify(result);
            client.close();
            return res.render('user', templateVals);
        });
    });
});

module.exports = router;