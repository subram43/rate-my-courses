var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');
const MongoClient = require('mongodb').MongoClient;
var dotenv = require('dotenv');
dotenv.config();
const uri = `mongodb+srv://subram43:${process.env.DATABASE_KEY}@maincluster-1u199.azure.mongodb.net/test?retryWrites=true&w=majority`;

var registrationErrors = [
    check('email', 'Invalid Email')
        .isEmail()
        .normalizeEmail(),
    check('university', 'Must select university')
        .not().equals('Choose...'),
    check('newUsername', 'Invalid Username')
        .trim()
        .isLength({min: 1}),
    check('newPassword', 'Password must be of length > 6')
        .isLength({min: 6})
];

var ratingErrors = [
    check('university', 'Must select university')
        .not().equals('Choose...'),
    check('coursePrefix', 'Invalid Course Prefix')
        .trim()
        .isLength({min: 1})
        .not().contains(' '),
    check('courseNumber', 'Invalid Course Number')
        .trim()
        .isLength({min: 1})
        .not().contains(' '),
    check('courseComments', 'Must leave a course comment')
        .trim()
        .isLength({min: 1})
];

/* GET home page. */
router.get('/', function(req, res, next) {
    var templateVals = {
        errors: null,
        loggedIn: req.user
    };
    return res.render('index', templateVals);
});

router.get('/login', function(req, res, next) {
    return res.redirect('/');
});

router.post('/login', function(req, res, next) {
    var templateVals = {
        loggedIn: false
    };
    var errMsg = [{
        msg: 'Server error occured. Please try again.',
        val: 'login'
    }];
    var formData = req.body;
    MongoClient.connect(uri, {useUnifiedTopology: true}, function(err, client) {
        if (err) {
            templateVals.errors = JSON.stringify(errMsg);
            client.close();
            return res.render('index', templateVals);
        };

        var db = client.db('app');
        var dbQuery = {
            username: formData.username
        };

        db.collection('users').findOne(dbQuery, function(err, result) {
            if (err) {
                templateVals.errors = JSON.stringify(errMsg);
                client.close();
                return res.render('index', templateVals);

            } else if (!result || !bcrypt.compareSync(formData.password, result.password)) {

                errMsg[0].msg = 'Incorrect user/password combination';
                errMsg[0].val = 'login';
                templateVals.errors = JSON.stringify(errMsg);

                client.close();
                return res.render('index', templateVals);

            } else {
                req.session.userId = result._id;
                client.close();
                return res.redirect('/');
            }
        });
    });
});


router.post('/', registrationErrors, function(req, res, next) {
    var templateVals = {
        loggedIn: false
    };
    var errMsg = [{
        msg: 'Server error occured. Please try again.',
        val: 'registration'
    }];
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        var errorsArray = errors.array();
        errorsArray[0].val = 'registration';
        templateVals.errors = JSON.stringify(errorsArray);
        return res.render('index', templateVals);
    } else {
        var formData = req.body;
        var hash = bcrypt.hashSync(formData.newPassword, 10);
        formData.newPassword = hash;

        MongoClient.connect(uri, {useUnifiedTopology: true}, function(err, client) {
            if (err) {
                client.close();
                templateVals.errors = JSON.stringify(errMsg);
                return res.render('index', templateVals);
            };
            
            var db = client.db('app');
            var usernameQuery = {
                username: formData.newUsername
            };

            var emailQuery = {
                email: formData.email
            };

            var dbQuery = {
                $or: [ usernameQuery, emailQuery ]
            };
            db.collection('users').find(dbQuery).toArray(function (err, result) {
                if (err) {
                    client.close();
                    templateVals.errors = JSON.stringify(errMsg);
                    return res.render('index', templateVals);

                } else if (result.length != 0) {
                    errMsg[0].msg = 'User already exists';
                    errMsg[0].val = 'registration'
                    templateVals.errors = JSON.stringify(errMsg);

                    client.close();
                    return res.render('index', templateVals);

                } else {
                    formData.username = formData.newUsername;
                    formData.password = formData.newPassword;
                    delete formData.newUsername;
                    delete formData.newPassword;

                    db.collection('users').insertOne(formData, function(err, res) {
                        if (err) {
                            client.close();
                            templateVals.errors = JSON.stringify(errMsg);
                            return res.render('index', templateVals);
                        };
                    });

                    client.close();
                    templateVals.errors = null;
                    return res.render('index', templateVals);
                }
            });

        });        
    }
});

router.get('/newrating', function(req, res, next) {
    res.redirect('/');
});


router.post('/newrating', ratingErrors, function(req, res, next) {
    var templateVals = {
        loggedIn: true
    };
    var errMsg = [{
        msg: 'Server error occured. Please try again.',
        val: 'registration'
    }];

    if (!req.user) {
        return res.redirect('/');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        var errorsArray = errors.array();
        errorsArray[0].val = 'rating';
        templateVals.errors = JSON.stringify(errorsArray);
        return res.render('index', templateVals);
    }

    MongoClient.connect(uri, {useUnifiedTopology: true}, function(err, client) {
        if (err) {
            templateVals.errors = JSON.stringify(errMsg);
            client.close();
            return res.render('index', templateVals);
        }

        var formData = req.body;
        formData.coursePrefix = formData.coursePrefix.toUpperCase();
        formData.user = req.user.username;

        var db = client.db('app');

        var dbQuery = {
            user: formData.user,
            coursePrefix: formData.coursePrefix,
            courseNumber: formData.courseNumber,
            courseUniversity: formData.courseUniversity
        };

        db.collection('ratings').findOne(dbQuery, function(err, result) {
            if (err) {
                templateVals.errors = JSON.stringify(errMsg);
                client.close();
                return res.render('index', templateVals);
                
            } else if (result) {
                errMsg[0].msg = 'User already rated this course';
                errMsg[0].val = 'rating';

                templateVals.errors = JSON.stringify(errMsg);
                client.close();
                return res.render('index', templateVals);

            } else {
                db.collection('ratings').insertOne(formData, function(err, res) {
                    if (err) {
                        templateVals.errors = JSON.stringify(errMsg);
                        client.close();
                        return res.render('index', templateVals);
                    }
                });
    
                var dbQuery = {
                    coursePrefix: formData.coursePrefix, 
                    courseNumber: formData.courseNumber, 
                    courseUniversity: formData.courseUniversity
                };
    
                db.collection('courses').findOne(dbQuery, function(err, result) {
                    if (err) {
                        templateVals.errors = JSON.stringify(errMsg);
                        client.close();
                        return res.render('index', templateVals);
                    } if (!result) {
                        db.collection('courses').insertOne(dbQuery, function(err, response) {
                            if (err) {
                                templateVals.errors = JSON.stringify(errMsg);
                                client.close();
                                return res.render('index', templateVals);
                            }
                            client.close();
                            return res.redirect('/');
                        });
                    } else {
                        client.close();
                        return res.redirect('/');
                    } 
                });
            }
        });
    }); 
});

router.get('/logout', function(req, res, next) {
    if (req.user) {
        req.session.reset();
    }

    res.redirect('/');
});

module.exports = router;
