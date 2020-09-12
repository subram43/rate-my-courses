var express = require('express');
var router = express.Router();
var url = require('url');
const MongoClient = require('mongodb').MongoClient;
var dotenv = require('dotenv');
dotenv.config();
const uri = `mongodb+srv://subram43:${process.env.DATABASE_KEY}@maincluster-1u199.azure.mongodb.net/test?retryWrites=true&w=majority`;

/* GET univ page. */
router.get(/\/.+/, function (req, res, next) {
    
    var templateVals = {
        errors: null, 
        loggedIn: req.user, 
    };

    var errMsg = [{
        msg: 'Server error occured. Please try again.',
        val: 'univ'
    }];

    var university = url.parse(req.url, true).pathname.substring(1).split('\%20').join(' ');
    templateVals.university = university;

    MongoClient.connect(uri, {useUnifiedTopology: true}, function(err, client) {
        if (err) {
            templateVals.results = JSON.stringify([]);
            templateVals.errors = JSON.stringify(errMsg);
            client.close();
            return res.render('univ', templateVals);
        }

        var db = client.db('app');
        var dbQuery = {
            courseUniversity: university
        };
        var courseSort = {coursePrefix: 1, courseNumber: 1};
        db.collection('courses').find(dbQuery).sort(courseSort).toArray(function(err, result) {
            if (err) {
                templateVals.results = JSON.stringify([]);
                templateVals.errors = JSON.stringify(errMsg);
                client.close();
                return res.render('univ', templateVals);
            }

            templateVals.results = JSON.stringify(result);

            client.close();
            return res.render('univ', templateVals);
        });
    });
});


module.exports = router;