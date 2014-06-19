(function($, _, Backbone) {

    var TinyPlayer = Backbone.View.extend({
        className: "tiny-player",

        playState: {
            STOPPED: 1,
            PLAYING: 2,
            PAUSED: 3
        },

        template: _.template([
            "<div class='player'>",
            "    <div class='seek-bar'><div></div></div>",
            "    <div class='play-control'>",
            "        <button class='prev-song icon-to-start glass-button'></button>",
            "        <button class='play-pause icon-play glass-button'></button>",
            "        <button class='next-song icon-to-end glass-button'></button>",
            "    </div>",
            "    <div class='track-info'></div>",
            "    <div class='volume'>",
            "        <button title='Mute' class='mute icon-volume-up glass-button'></button>",
            "        <div></div>",
            "    </div>",
            "    <div class='toolbar'>",
            "      <button title='Shuffle' class='shuffle icon-shuffle glass-button'></button>",
            "      <button title='Repeat' class='loop icon-loop glass-button on'></button>",
            "      <button title='Show PlayList' class='expand icon-list glass-button'></button>",
            "    </div>",
            "</div>",
            "<div class='content'>",
            "    <div class='play-queue'>",
            "    </div>",
            "    <div class='search-result'>",
            "        <ul></ul>",
            "    </div>",
            "    <div class='bottom-bar'>",
            "        <div class='search-bar'>",
            "            <span class='search-icon ui-icon ui-icon-search'></span>",
            "            <input type='text' placeholder='Find tracks'/>",
            "        </div>",
            "        <div class='search-hide'>Hide Search</div>",
            "    </div>",
            "</div>",
        ].join("")),

        queueItemTemplate: _.template([
            "<div title='<%= track.user.username + '-' + track.title %>' class='queue-item'>",
            "    <span title='Remove Track' class='remove ui-icon ui-icon-circle-close'></span>",
            "    <div <% if(track.artwork_url) { %> style='background-image:url(<%= track.artwork_url %>)' <% } %> class='artwork'></div>",
            "    <div class='content'>",
            "        <div class='user'><%= track.user.username %></div>",
            "        <div class='title'><%= track.title %></div>",
            "    </div>",
            "</div>"
        ].join("")),

        searchItemTemplate: _.template([
            "<li class='track-item'>",
            "    <div title='Add track to queue' class='add'>+</div>",
            "    <div <% if(track.artwork_url) { %> style='background-image:url(<%= track.artwork_url %>)' <% } %> class='artwork'></div>",
            "    <div class='content'>",
            "        <div class='user'><%= track.user.username %></div>",
            "        <div class='title'><%= track.title %></div>",
            "    </div>",
            "</li>"
        ].join("")),

        events: {
            "click .play-pause": "handlePlayPause",
            "click .next-song": "handleNextSong",
            "click .prev-song": "handlePrevSong",

            "slidestop .seek-bar": "handleSeek",
            "slidestart .seek-bar": "handleSeekStart",

            "DOMMouseScroll .volume > div": "handleSliderWheel",
            "slide .volume": "handleVolumeChange",
            "slidechange .volume": "handleVolumeChange",
            "click .volume .mute": "handleMute",
            
            "click .queue-item": "handleQueuePlay",
            "click .queue-item .remove": "handleQueueRemove",

            "click .track-item .add": "handleTrackAdd",
            "keyup .search-bar input": "handleSearch",
            "click .bottom-bar .search-hide": "handleSearchClear",

            "click .toolbar .expand": "handleToolbarExpand",
            "click .toolbar .loop": "handleToolbarLoop",
            "click .toolbar .shuffle": "handleToolbarShuffle",
        },

        initialize: function(opts) {
            this.scClientId = opts.scClientId;
            this.sc = SC.initialize({
                client_id: this.scClientId
            });

            this.audio = new Audio();
            this.audio.addEventListener("ended", _.bind(this.handlePlayEnd, this));
            this.audio.addEventListener("timeupdate", _.bind(this.handleTimeUpdate, this));

            this.status = this.playState.STOPPED;
            this.loop = true;
            this.shuffle = false;

            this.handleSearch = _.debounce(this.handleSearch, opts.debounceWait || 500);
        },

        render: function() {
            this.$el.append(this.template({cid: this.cid}));
            this.$(".search-result").hide();
            this.$(".search-hide").hide();
            this.$el.children(".content").hide();

            this.$(".seek-bar div").slider({
                range: "min"
            });

            this.$(".volume div").slider({
                range: "min",
                value: this.audio.volume*100
            });

            this.playPauseIcon();
        },

        playTrack: function(queueItem) {
            var track = queueItem.data("tinyPlayerTrack");
            this.audio.src = track.stream_url + "?client_id=" + this.scClientId;
            this.audio.play();
            this.status = this.playState.PLAYING;

            this.$(".play-queue .queue-item").removeClass("playing");
            queueItem.addClass("playing");
            this.playPauseIcon();

            var infoText = track.user.username + "-" + track.title;
            this.$(".track-info")
                .attr("title", infoText)
                .text(infoText)
                .css("background", "linear-gradient(to right, transparent 0%, #343434 50%), url("+track.artwork_url+") no-repeat left center / 200px auto");
        },

        playPauseIcon: function() {
            this.$(".play-pause").removeClass("icon-pause icon-play icon-stop");
            var iconClass;
            switch(this.status) {
                case this.playState.STOPPED:
                    iconClass = "icon-play";
                    break;
                case this.playState.PAUSED:
                    iconClass = "icon-play";
                    break;
                case this.playState.PLAYING:
                    iconClass = "icon-pause";
                    break;
            }
            this.$(".play-pause").removeClass("icon-pause icon-play icon-stop").addClass(iconClass);
        },

        clearSearch: function() {
            this.$(".search-bar").removeClass("busy no-result").find("input").val("");
            this.$(".search-result").slideUp();
            this.$(".search-hide").fadeOut();
        },

        playNext: function(prev) {
            var nextItem;
            if(this.shuffle) {
                var queueItems = this.$(".play-queue .queue-item:not(.playing)");
                nextItem = queueItems.eq(_.random(0, queueItems.length-1));
            } else {
                var currentItem = this.$(".play-queue .queue-item.playing");
                if(prev) {
                    if(this.loop && currentItem.is(":first-child")) {
                        nextItem = this.$(".play-queue .queue-item:last");
                    } else {
                        nextItem = currentItem.prev();
                    }
                } else {
                    if(this.loop && currentItem.is(":last-child")) {
                        nextItem = this.$(".play-queue .queue-item:first");
                    } else {
                        nextItem = currentItem.next();
                    }
                }
            }
            if(nextItem.length) {
                this.playTrack(nextItem);
            } else {
                this.audio.pause();
                this.$(".play-queue .queue-item").removeClass("playing");
                this.$(".seek-bar > div").slider("value", 0);
                this.status = this.playState.STOPPED;
                this.$(".track-info").attr("title", "").text("").css("background", "transparent");
                this.playPauseIcon();
            }
        },

        // event handlers
        handleSearch: function() {
            var query = $.trim(this.$(".search-bar input").val());
            if(query === "") {
                this.$(".search-result").slideUp();
                this.$(".search-hide").fadeOut();
                return;
            }

            this.$(".search-bar").addClass("busy");
            this.sc.get("/tracks", {q: query}, _.bind(function(tracks) {
                tracks = _.filter(tracks, function(track) {
                    return track.streamable;
                });
                this.$(".search-bar").removeClass("busy no-result");
                var list = this.$(".search-result ul");
                list.empty();
                for(var i = 0;i < tracks.length;i++) {
                    var item = $(this.searchItemTemplate({track: tracks[i]}));
                    item.data("tinyPlayerTrack", tracks[i]);
                    list.append(item);
                }
                this.$(".search-result").scrollTop(0);
                if(tracks.length) {
                    this.$(".search-result").slideDown();
                    this.$(".search-hide").fadeIn();
                } else {
                    this.$(".search-result").slideUp();
                    this.$(".search-hide").fadeOut();
                    this.$(".search-bar").addClass("no-result");
                }
            }, this));
        },

        handleTrackAdd: function(event) {
            var track = $(event.target).closest(".track-item").data("tinyPlayerTrack");
            var queueItem = $(this.queueItemTemplate({track: track}));
            queueItem.data("tinyPlayerTrack", track);
            this.$(".play-queue").append(queueItem);
        },

        handleSearchClear: function() {
            this.clearSearch();
        },

        handleQueueRemove: function(event) {
            var item = $(event.target).closest(".queue-item");
            if(item.hasClass("playing")) {
                this.playNext();
            }
            item.remove();
            event.stopPropagation();
        },

        handleQueuePlay: function(event) {
            var item = $(event.target).closest(".queue-item");
            this.playTrack(item);
        },

        handlePlayPause: function(event) {
            switch(this.status) {
                case this.playState.STOPPED:
                    var item = this.$(".play-queue .queue-item:eq(0)");
                    if(item.length) {
                        this.playTrack(item);
                    }
                    break;
                case this.playState.PAUSED:
                    this.audio.play();
                    this.status = this.playState.PLAYING;
                    break;
                case this.playState.PLAYING:
                    this.audio.pause();
                    this.status = this.playState.PAUSED;
                    break;
            }
            this.playPauseIcon();
        },

        handlePlayEnd: function() {
            this.playNext();
        },

        handleTimeUpdate: function() {
            if(!this.isSeekSliding && this.status != this.playState.STOPPED) {
                var value = (this.audio.currentTime/this.audio.duration)*100;
                this.$(".seek-bar > div").slider("value", value);
            }
        },

        handleSeek: function(event, ui) {
            var value = ui.value;
            this.audio.fastSeek((value/100) * this.audio.duration);
            this.isSeekSliding = false;
        },

        handleSeekStart: function() {
            if(this.status != this.playState.PLAYING) {
                return false;
            }
            this.isSeekSliding = true;
        },

        handleToolbarExpand: function(event) {
            var button = $(event.target);
            button.toggleClass("on");
            if(!button.hasClass("on")) {
                this.clearSearch();
            }
            this.$el.children(".content").slideToggle();
        },

        handleToolbarLoop: function(event) {
            $(event.target).toggleClass("on");
            this.loop = !this.loop;
        },

        handleToolbarShuffle: function(event) {
            $(event.target).toggleClass("on");
            this.shuffle = !this.shuffle;
        },

        handleNextSong: function() {
            this.playNext();
        },

        handlePrevSong: function() {
            this.playNext(true);
        },

        handleVolumeChange: function(event, ui) {
            var volume = ui.value/100;
            this.audio.volume = volume;
        },

        handleMute: function() {
            if(this.audio.muted) {
                this.$(".volume button").removeClass("icon-volume-off").addClass("icon-volume-up");
                this.$(".volume > div").slider("enable");
                this.audio.muted = false;
            } else {
                this.$(".volume button").removeClass("icon-volume-up").addClass("icon-volume-off");
                this.$(".volume > div").slider("disable");
                this.audio.muted = true;
            }
        },

        handleSliderWheel: function(event) {
            var slider= $(event.currentTarget);
            var oe = event.originalEvent;
            var delta = 0, value = slider.slider('value');

            if (oe.wheelDelta) {
                delta = -oe.wheelDelta;
            }
            if (oe.detail) {
                delta = oe.detail * 40;
            }

            value -= delta / 8;
            if (value > 100) {
                value = 100;
            }
            if (value < 0) {
                value = 0;
            }

            slider.slider('value', value);
        }
    });

    window.TinyPlayer = TinyPlayer;

})(jQuery, _, Backbone);
