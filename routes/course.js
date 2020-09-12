var express = require('express');
var router = express.Router();
var url = require('url');
const MongoClient = require('mongodb').MongoClient;
var dotenv = require('dotenv');
dotenv.config();
const uri = `mongodb+srv://subram43:${process.env.DATABASE_KEY}@maincluster-1u199.azure.mongodb.net/test?retryWrites=true&w=majority`;

/* GET course page. */
router.get(/\/.+\/.+/, function (req, res, next) {
    var templateVals = {
        errors: null,
        loggedIn: req.user,
    };

    var errMsg = [{
        msg: 'Server error occured. Please try again.',
        val: 'course'
    }];

    var universityCourseCombo = url.parse(req.url, true).pathname.substring(1).split('\%20').join(' ').split('/');
    var courseSplit = universityCourseCombo[1].split(' ');
    var university = universityCourseCombo[0];
    var prefix = courseSplit[0];
    var number = courseSplit[1];
    templateVals.university = university;
    templateVals.courseNumber = `${prefix} ${number}`;

    MongoClient.connect(uri, {useUnifiedTopology: true}, function(err, client) {
        if (err) {
            templateVals.errors = JSON.stringify(errMsg);
            client.close();
            return res.render('course', templateVals);
        }

        var db = client.db('app');
        var dbQuery = { 
            courseUniversity: university, 
            coursePrefix: prefix, 
            courseNumber: number 
        };
        var projection = { 
            projection: {
                _id: 0, 
                courseValue: 1, 
                courseDifficulty: 1, 
                courseComments: 1
            } 
        };

        db.collection('ratings').find(dbQuery, projection).toArray(function(err, result) {
            if (err) {
                templateVals.errors = JSON.stringify(errMsg);
                client.close();
                return res.render('course', templateVals);

            } else if (result.length == 0) {
                client.close();
                return res.sendStatus(404);
            }

            templateVals.results = JSON.stringify(result);
            var arrayLength = parseFloat(result.length);
            var valueAvg = result
                            .map(function(obj) { return parseFloat(obj.courseValue) })
                            .reduce(function(a,b) { return a + b; }) / arrayLength;
            
            var difficultyAvg = result
                                .map(function(obj) { return parseFloat(obj.courseDifficulty) })
                                .reduce(function(a,b) { return a + b; }) / arrayLength;
            
            templateVals.valueAvg =  valueAvg.toFixed(1);
            templateVals.difficultyAvg = difficultyAvg.toFixed(1);

            client.close();
            return res.render('course', templateVals);
        });
    });
});

module.exports = router;