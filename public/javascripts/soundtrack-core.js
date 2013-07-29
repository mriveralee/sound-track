$(document).ready(function() {

var KEY = {
	ENTER: 13
};

// Model

var SoundTrackModel = Backbone.Model.extend({
	defaults: {
		artist: '',
		youtube: [],
		concerts: [],
		tweets: {},
		wiki: {}
	},

	urlRoot: '/search/',
	initialize: function() {
		// Do Nothing
	},

	updateArtist: function(artist) {
		artist = artist.trim();
		this.artist = artist;
		this.id = artist;
		this.refreshData();
	},

	getVideos: function() {
		return this.get('youtube');
	},

	getWikie: function() {
		return this.get('wiki');
	},

	getConcerts: function() {
		return this.get('concerts');
	},

	getTweets: function() {
		return this.get('tweets');
	},

 refreshData: function() {
      //Fetch tree model from server using the following method
      /* 1) Generates a URL from host+urlRoot+'/'+id
       *    Ex: Assume id = 123 
      *       URL IS: http://localhost:8000/ + urlRoot + / + 123
       */
      this.fetch({
        success: function(model, res, options) {
          if (res) {
           console.log(res); 
           this.youtube = res.youtube;
           this.concerts = res.concerts;
           this.wiki = res.wiki,
           this.tweets = res.twitter 
          } 
        },
        error: function(model, res, options) {
          console.log("Error getting Artist model");
        }
      });


    }

});

// Views

var SearchBarView = Backbone.View.extend({

	template: function() {
		var temp =
			'<input class="search-input" type="text" placeholder="Search for an artist">' +
			'<button class="search-button" type="submit">Track</button>'
			;
		return temp;
	},

	el: $('#searchbar-container'),

	events: {
		'click .search-button': 'updateModel',
		'keyup': 'handleKeypress'
	},

	initialize: function() {
		this.render();
	},

	render: function() {
		$(this.el).html(this.template());
	},

	updateModel: function() {
		var artist = $('.search-input').val();
		this.model.updateArtist(artist);
	},

	handleKeypress: function(e) {
		var key = e.which;
		switch(key) {
			case KEY.ENTER:
				this.updateModel();
				break;
		}
	}

});


var VideoResultsView = Backbone.View.extend({

	template: function() {
		var temp = '<div id="'+this.elName+'""></div>';
		return temp;
	},

	parentEl: $('#main-content'),
	elName: 'video-results',
	el: null,
	maxDisplayCount: 15,

	events: {
	},

	initialize: function() {
		$(this.parentEl).append(this.template());
		this.el = $('#'+this.elName);
		this.listenTo(this.model, 'change', this.render);
	},

	render: function() {
		var videoItems = this.model.getVideos();
		var videoEmbeds = "";
		for (var i = 0; i < videoItems.length && i < this.maxDisplayCount; i++) {
			var item = videoItems[i];
			videoEmbeds += item.html + '<br>'; 
		}
		this.el.html(videoEmbeds);
	},

	updateModel: function() {
		var artist = $('.search-input').val();
		this.model.updateArtist(artist);
	},

	handleKeypress: function(e) {
		var key = e.which;
		switch(key) {
			case KEY.ENTER:
				this.updateModel();
				break;
		}
	}

});


// Initialize the jawnskis
var MainModel = new SoundTrackModel();
var SearchBar = new SearchBarView({model: MainModel});
var VideoResults = new  VideoResultsView({model: MainModel});

}); // End $(document).ready