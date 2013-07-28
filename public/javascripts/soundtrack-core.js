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
			"<input class='search-input' type='text' placeholder='Search for an artist'>" +
			"<button class='search-button' type='submit'>Track</button>"
			;
		return temp;
	},

	el: $('#searchbar-container'),

	events: {
		"click .search-button": "updateModel",
		"keyup": "andleKeypress"
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


// Initialize the jawnskis
var MainModel = new SoundTrackModel();
var SearchBar = new SearchBarView({model: MainModel});

}); // End $(document).ready