var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var sassMiddleware = require('node-sass-middleware');
var dotenv = require('dotenv');
const MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var dotenv = require('dotenv');
dotenv.config();
const uri = `mongodb+srv://subram43:${process.env.DATABASE_KEY}@maincluster-1u199.azure.mongodb.net/test?retryWrites=true&w=majority`;

const sessions = require('client-sessions');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/user');
var searchRouter = require('./routes/search');
var courseRouter = require('./routes/course');
var univRouter = require('./routes/univ');

var app = express();
dotenv.config();
var settings = require('./settings');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: true, // true = .sass and false = .scss
  sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));

// use sessions to store user information in client
app.use(sessions({
    cookieName: 'session',
    secret: settings.SESSION_SECRET_KEY,
    duration: settings.SESSION_DURATION,
    activeDuration: settings.SESSION_EXTENSION_DURATION,
    cookie: {
        httpOnly: true,
        ephemeral: settings.SESSION_EPHEMERAL_COOKIES,
        secure: settings.SESSION_SECURE_COOKIES,
    }
}));

app.use((req, res, next) => {
    if (!(req.session && req.session.userId)) {
        return next();
    }

    MongoClient.connect(uri, {useUnifiedTopology: true}, function(err, client) {
        if (err) return next(err);

        var db = client.db('app');
        db.collection('users').findOne({_id: ObjectId(req.session.userId)}, function(err, result) {
            if (err) {
                return next(err);
            }

            if (!result) {
                client.close();
                return next();
            } else {
                result.password = undefined;
                req.user = result;
                next();
            }
        });
    });
});

app.use('/', indexRouter);
app.use('/user', usersRouter);
app.use('/search', searchRouter);
app.use('/course', courseRouter);
app.use('/univ', univRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
