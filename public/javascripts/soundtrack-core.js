$(document).ready(function() {

// Model

var SoundTrackModel = Backbone.Model.extend({
	defaults: {

	},

	initialize: function() {

	},

	updateArtist: function() {
		this.artist = $('.search-input').val();
		console.log("fetch dis jawn for " + this.artist);
	}
});

// Views

var SearchBarView = Backbone.View.extend({

	template: function() {
		var temp =
			"<input class='search-input' type='text' placeholder='Search for an artist'>" +
			"<input class='search-button' type='submit' value='Track'>"
			;
		return temp;
	},

	el: $('#searchbar-container'),

	events: {
		"click .search-button": "updateModel"
	},

	initialize: function() {
		this.render();
	},

	render: function() {
		$(this.el).html(this.template());
	},

	updateModel: function() {
		this.model.updateArtist();
	}

});


// Initialize the jawnskis
var MainModel = new SoundTrackModel();
var SearchBar = new SearchBarView({model: MainModel});

}); // End $(document).ready