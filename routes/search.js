var express = require('express');
var router = express.Router();
var universityList = require('../universities.js').universityList;
const MongoClient = require('mongodb').MongoClient;
var dotenv = require('dotenv');
dotenv.config();
const uri = `mongodb+srv://subram43:${process.env.DATABASE_KEY}@maincluster-1u199.azure.mongodb.net/test?retryWrites=true&w=majority`;

/* POST search univ page. */
router.post('/univ', function (req, res, next) {
    var templateVals = {
        errors: null,
        loggedIn: req.user,
        searchforuniv: true,
    };

    var searchQuery = req.body.univSearch;
    templateVals.searchquery = `\'${searchQuery}\'`

    var searchResults = universityList.filter(function (entry) {
        return entry.university.toLowerCase().includes(searchQuery.toLowerCase());
    });

    templateVals.searchResults = JSON.stringify(searchResults);
    return res.render('search', templateVals);
});


/* POST search course page. */
router.post('/course', function (req, res, next) {
    var templateVals = {
        errors: null, 
        loggedIn: req.user, 
        searchforuniv: false, 
    };

    var errMsg = [{
        msg: 'Server error occured. Please try again.',
        val: 'search'
    }];

    var searchQuery = req.body.courseSearch;
    templateVals.searchquery = `\'${searchQuery}\'`;

    var searchArray = searchQuery.split(' ').filter(function(item) {
        return item.length != 0;
    });

    MongoClient.connect(uri, {useUnifiedTopology: true}, function(err, client) {
        if (err) {
            templateVals.searchResults = JSON.stringify([]);
            templateVals.errors = JSON.stringify(errMsg);
            client.close();
            return res.render('search', templateVals);
        };
        var db = client.db('app');

        var dbQuery = {};

        if (searchArray.length == 0) {
            dbQuery.coursePrefix = '';
            dbQuery.courseNumber = '';
        } else {
            dbQuery.coursePrefix = searchArray[0].toUpperCase();
            dbQuery.courseNumber = searchArray[1];
        }

        db.collection('courses').find(dbQuery).toArray(function(err, result) {
            if (err) {
                templateVals.searchResults = JSON.stringify([]);
                templateVals.errors = JSON.stringify(errMsg);
                client.close();
                return res.render('search', templateVals);
            }

            templateVals.searchResults = JSON.stringify(result);

            client.close();
            return res.render('search', templateVals); 
        });
    });
});

module.exports = router;