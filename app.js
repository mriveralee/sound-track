/**
 * Constants
 */

var YOUTUBE_COUNT = 50;
var YOUTUBE_API_KEY = 'AIzaSyBWoA1ZTbfptkRREoNpA9ryhlnQPrWbiqQ';
var YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3/search?part=snippet&q=';
var YOUTUBE_SEARCH_SUFFIX = '&maxResults='+ YOUTUBE_COUNT + '&type=video&videoCaption=closedCaption&key=';

var CONCERTS_APP_ID = 'SOUND_TRACKR';
var CONCERTS_BASE_URL = 'http://api.bandsintown.com/artists/';
var CONCERTS_EVENTS_SUFFIX = '/events.json?api_version=2.0&app_id=';

var WIKI_BASE_URL = 'http://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&titles=';
var WIKI_EXTRACTS_SUFFIX = '&exintro=1'

// DAT DATA because we don't need 
var YOUTUBE = {};
var CONCERTS = {};
var TWEETS = {};
var WIKI = {};

// Number of tweets to pull - max of 200
var TWEET_COUNT = 100;

// Twitter user ids
var TWITTER_USER_IDS = require('./twitter-handles').TWITTER_USER_IDS;

var OTHER_TWITTER_USERS_IDS = {
 'muse': '14583400',
 'ed sheeran': '85452649',
 'coldplay': '18863815'
};


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
var io = require('socket.io').listen(server, { log: false });
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
app.get('/', function(req, res) {
  var templateVars = {
      //Add some template variables
      PAGE_TITLE: "Node (Express 3.0.1) & Socket.io Bootstrap"
  };

  //Render the index.ejs file with any template variables
  res.render('index', templateVars);
});


/*
 * Search route
 *
 */
app.get('/search/:artist', function(req, res) {
  // if (!req.query || !req.query.artist || req.query.artist == '') {
  //   sendError(res, 'No Artist given');
  //   return;
  // }
  // var results;
  // var artist = toTitleCase(req.query.artist);
  if (!req.params || !req.params.artist || req.params.artist == '') {
    sendError(res, 'No Artist given');
    return;
  }
  var results;
  var artist = toTitleCase(req.params.artist);


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
  // Do get request to get youtube information
  var youtubeUrl = getYoutubeApiUrl(artist);
  request.get(youtubeUrl, function (error, response, body) {
    if (error) {
      callback(error, body);
      return;
    }
    body = JSON.parse(body);
    var results = [];
    if (body) {
      for (var i = 0; i < body.items.length; i++) {
        var item = body.items[i];
        var filteredItem = getFilteredYoutubeVideo(item);
        results.push(filteredItem);
        console.log(filteredItem);
      }
      // Cache results if there are some with no err
      YOUTUBE[artist] = results;
    }
    // TODO: Handle failed youtube request
    callback(null, results);
  });
}

/**
 * Does a get request to get tweets for an artist
 */
function getTweets(artist, callback) {
  // Do get request to get tweets
  var twitter_id = TWITTER_USER_IDS[artist.toLowerCase()];
  if (!twitter_id) {
    var doesNotExist = {
      error: "Could not find tweets for this artist"
    }
    callback(null, doesNotExist);
    return;
  }

  var params = "?screen_name="+twitter_id+"&count="+TWEET_COUNT+"&exclude_replies=true&include_rts=false";
  twitter.get("statuses/user_timeline/", params, function(error, data) {
          var results = [];
    if (error) {
      console.log(error);
      callback(null, error);
      return;
    }
    if (data) {
      // Cache results if there are some with no err
      data = JSON.parse(data);
      for (var i = 0; i < data.length; i++) {
        var tweet = data[i];
        var filteredTweet = getFilteredTweet(tweet);
        results.push(filteredTweet);
      }
      TWEETS[artist] = results;
    }

    // TODO: Handle failed twitter request
    callback(null, results);
    });
}


// Event to console log twitter data, yo
// twitter.on('get:statuses/user_timeline/', function(error, data){
//   var tweetData = (JSON.parse(data));
//   for (var i in tweetData) {
//     console.log(tweetData[i].text);
//   }
// });


/**
 * Does a get request to get wikipedia data for an artist
 */
function getWiki(artist, callback) {
  // Do get request to get wiki information
  var wikiUrl = getWikiApiUrl(artist);
  request.get(wikiUrl, function (error, response, body) {
    if (error) {
      callback(error, body);
      return;
    }
    if (body) {
      body = JSON.parse(body);
      results = getFilteredWiki(body);
      // Cache results if there are some with no err
      WIKI[artist] = results;
    }

    // TODO: Handle failed wiki request
    callback(null, results);
  });
}


/**
 * Returns the wiki api URL for an artist
 */
function getWikiApiUrl(artist) {
  return WIKI_BASE_URL + artist + WIKI_EXTRACTS_SUFFIX;
}


/**
 * Make a request to the Concerts API to get the upcoming concerts for an artist
 * and run a callback
 */
function getConcerts(artist, callback) {
  // DO Request.get to get concerts information
  var concertsUrl = getConcertsApiUrl(artist);
  request.get(concertsUrl, function (error, response, body) {
    if (error) {
      callback(error, body);
      return;
    }

    var results = [];
    if (body) {
      body = JSON.parse(body);
      for (var i = 0; i < body.length; i++) {
        var item = body[i];
        var filteredConcert = getFilteredConcert(item);
        results.push(filteredConcert);
      }
      // Cache results if there are some with no err
      CONCERTS[artist] = results;
    }
    // TODO: Handle failed concerts request
    callback(null, results);
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

/**
 * Returns a title case version of an input string
 */
function toTitleCase(str) {
  return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
} 


/**
  * Gets a youtube url for an artist
  */
function getYoutubeApiUrl(artist) {
  return YOUTUBE_BASE_URL + artist + YOUTUBE_SEARCH_SUFFIX + YOUTUBE_API_KEY;
}

/**
  * Helper function to get an embed tag for a youtube video by video id 
  */
function getYoutubeEmbedTag(videoId, width, height) {
  width = (width) ? width : 320;
  height = (height) ?height : 240;
  return '<iframe width="' + width + '" height="' + height + '" src="http://www.youtube.com/embed/' + videoId + '" frameborder="0" allowfullscreen></iframe>';
}

/**
 * Filters the youtube video data and returns a basic filterd information
 */
function getFilteredYoutubeVideo(videoData) {
  var video = {
    name: (videoData.snippet && videoData.snippet.title) ? videoData.snippet.title : "Untitled",
    html: (videoData.id && videoData.id.videoId) ? getYoutubeEmbedTag(videoData.id.videoId) : '',
    thumbnail: (videoData.snippet && videoData.snippet.thumbnails && videoData.snippet.thumbnails.default) ? videoData.snippet.thumbnails.default.url : ''
  };

  return video;
}

/**
  * Filters a tweet and returns a basic tweet data object
  */
function getFilteredTweet(tweetData) {
  var filteredTweet = {
    created: tweetData.created_at,
    text: tweetData.text,
    twitter_id: tweetData.user.screen_name,
    tweet_id: tweetData.id_str,
    url: getTweetUrl(tweetData.id_str, tweetData.user.screen_name),
    artist: tweetData.user.name,
    location: tweetData.user.location,
    profile_img: tweetData.user.profile_background_image_url
  };
  return filteredTweet;
}

/**
  * Get status update url for a tweet
  */
function getTweetUrl(tweetId, twitterId) {
  return 'http://twitter.com/' + twitterId + '/statuses/' + tweetId.toString();
}

/**
  * Filters wikipedia data for an artist
  */
function getFilteredWiki(wikiData) {
  var pages = (wikiData && wikiData.query) ? wikiData.query.pages : [];
  var firstPage = {}; 
  // Grab first page
  for (var key in pages) {
    firstPage = pages[key];
    break;
  }
  // Convert to filtered data
  var wiki = {
    title: firstPage.title ? firstPage.title : '',
    page_id: firstPage.pageid,
    url: getWikipediaUrl(firstPage.pageid),
    about: firstPage.extract
  };
  return wiki;
}

/**
  * Gets a wikipedia article url from wikipedia article id 
  */ 
function getWikipediaUrl(pageId) {
  return 'http://en.wikipedia.org/wiki?curid=' + pageId;
}

/**
  * Filters concert data for an artist
  */
function getFilteredConcert(concertData) {

  var concert = {
    ticket_status: concertData.ticket_status,
    title: concertData.title,
    description: concertData.description,
    date: concertData.formatted_datetime,
    location: concertData.formatted_location,
    ticket_url: concertData.ticket_url,
    fb_rsvp_url: concertData.facebook_rsvp_url
  };
  return concert;
}







