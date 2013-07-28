/**
 * Constants
 */

var CONCERTS_APP_ID = 'SOUND_TRACKR';
var CONCERTS_BASE_URL = "http://api.bandsintown.com/artists/";
var CONCERTS_EVENTS_SUFFIX = "/events.json?api_version=2.0&app_id=";


// DAT DATA because we don't need 
var YOUTUBE = {};
var CONCERTS = {};
var TWEETS = {};
var WIKI = {};

// Number of tweets to pull - max of 200
var TWEET_COUNT = 100;

// Twitter user ids
var a = require('./twitter-handles');
var TWITTER_USER_IDS = a.TWITTER_USER_IDS;

var OTHER_TWITTER_USERS_IDS = {
 'muse': '14583400',
 'ed sheeran': '85452649',
 'coldplay': '18863815'
}


/**
 * Module dependencies.
 */

var util = require("util");

var express = require('express')
  , http = require('http')
  , path = require('path')
  , async = require('async')
  , CONSTANTS = require('./constants')    //App Constants Vars
  , CONFIG = require('./config');          //App Configuration Vars
var request = require('request');


//Express App
var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || CONFIG.server_port);
  app.set('views', __dirname + '/views');
  app.set('view engine', CONFIG.template_engine);
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(app.router);

});

app.configure('development', function(){
  app.use(express.errorHandler());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());

});

// Twitter API Access
 var twitter = require('simple-twitter');
 twitter = new twitter( 'e8ng8WPJrnXGOPIZQ02Cg', //consumer key from twitter api
                        'rTpWpwYvYJSeimJXHclDVhAsvMRXTsugtGWLTkSN8U', //consumer secret key from twitter api
                        '287883883-p9YnvTpVYKlbNuBmXiNrjnr5IlPvqvkd4pfsiUm3', //acces token from twitter api
                        '4f76p8gLmbJnTwa1hIovWwEQ4xueRv84kOtMQ3PiqEQ', //acces token secret from twitter api
                        false //3600  //(optional) time in seconds in which file should be cached (only for get requests), put false for no caching
                        );

//Run the Server
var server = http.createServer(app);
server.listen(CONFIG.server_port, function() {
  //Log the name of the app from the constants.js file
  console.log(CONSTANTS.app_name);
  
  //Log the port the server is running on - from the config file
  console.log("\n****\n* SERVER RUNNING ON PORT: " + CONFIG.server_port + " *\n****\n");
});


//################ Socket IO ######################//
var io = require('socket.io').listen(server);
//Turn off server-side heartbeat & debug messages from socket.io
// io.set("log level", 0);   

io.sockets.on('connection', function (socket) {
  
  //Sends an event to a connected client with the tag 'my server event'
  socket.emit('my server event', {hello: "I was sent from the server!"});
  
  //Receives an event from the client with the tag 'my client event;'
  socket.on('my client event', function (data) {
       //Log the data sent from the client
       console.log(data);
  });
});


//################ Routes ######################//



/**
 * Main (Home) route
 */
app.get('/home', function(req, res) {
  var templateVars = {
      //Add some template variables
      PAGE_TITLE: "Node (Express 3.0.1) & Socket.io Bootstrap"
  };

  //Render the index.ejs file with any template variables
  res.render('index', templateVars);
  res.json
  res.send
});


/*
 * Search route
 *
 */
app.get('/search', function(req, res) {
  if (!req.query || !req.query.artist) {
    sendError(res, 'No Artist given')
  }
  var results;
  var artist = req.query.artist;

  var hasCache = YOUTUBE[artist] && CONCERTS[artist] && WIKI[artist] && TWEETS[artist];
  if (hasCache) {
    // Send cached results
    var cache = {
      youtube: YOUTUBE[artist],
      concerts: CONCERTS[artist],
      tweets: TWEETS[artist],
      wiki: WIKI[artist]
    };
    res.json(200, cache);
    return;
  } 

  // Otherwise get the data from each source and cache it
  async.parallel({
    youtube: function(callback) {
      // Hit youtube
      getYoutubeVideos(artist, callback);
    },
    twitter: function(callback){
      // Hit twitter
      getTweets(artist, callback);
    },
    wiki: function(callback) {
      getWiki(artist, callback);
    },
    concerts: function(callback) {
      getConcerts(artist, callback);
    }
  }, function(err, results) {
      // do some filtering
      if (err) {
        console.log(err);
        res.send(500, err);
      } else {
        res.json(200, results);
      }
    // results is now equals to: {one: 1, two: 2}
  });
});

/**
  * Does a get request to get youtube videos for an artist
  */
function getYoutubeVideos(artist, callback) {
  // DO Request.get to get youtube videos
  var results;
  if (results != null) {
    // Cache results if there are some with no err
    YOUTUBE[artist] = results;
  }
  callback(null, results);
}

/**
 * Does a get request to get tweets for an artist
 */
function getTweets(artist, callback) {
  // Do get request to get tweets
  var params = "?screen_name=muse&count="+TWEET_COUNT+"&exclude_replies=true&include_rts=false";
  twitter.get("statuses/user_timeline/", params, function(error, data) {
    if (data != null) {
      // Cache results if there are some with no err
      TWEETS[artist] = data;
    }
    callback(null, data);
    });
}


// Event to console log twitter data, yo
twitter.on('get:statuses/user_timeline/', function(error, data){
  var tweetData = (JSON.parse(data));
  for (var i in tweetData) {
    console.log(tweetData[i].text);
  }
});


/**
 * Does a get request to get wikipedia data for an artist
 */
function getWiki(artist, callback) {
  // DO Request.get to get wiki information
  var results;
  if (results != null) {
    // Cache results if there are some with no err
    WIKI[artist] = results;
  }
  callback(null, results);
}


/**
 * Make a request to the Concerts API to get the upcoming concerts for an artist
 * and run a callback
 */
function getConcerts(artist, callback) {
  // DO Request.get to get concerts information
  var concertsURL = getConcertsApiUrl(artist);
  request.get(concertsURL, function (error, response, body) {
    if (error) {
      callback(error, body);
      return;
    }
    if (body) {
      console.log(body);
      // Cache results if there are some with no err
      CONCERTS[artist] = body;
    }
    callback(null, body);
  });
}

/**
 * Returns the concerts api url for an artist
 */
function getConcertsApiUrl(artist) {
  return CONCERTS_BASE_URL + artist + CONCERTS_EVENTS_SUFFIX + CONCERTS_APP_ID;
}

/**
 * Helper function to send an error to the client
 */
function sendError(res, errorStr) {
  res.send(500, { error: errorStr });
}




