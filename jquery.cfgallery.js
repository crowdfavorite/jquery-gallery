/*!
 * cfgallery - a light-weight, semantic gallery script with bookmarkable slides.
 * version 1.2
 *
 * Copyright (c) 2011-2013 Crowd Favorite (http://crowdfavorite.com)
 */
(function($) {

	var PROP_NAME = 'cfgallery',
		instActive;

	/* Constructor */
	function CFGallery() {
		this._defaults = {
			stageDimensions: [710, 474],
			start: 0,
			activatedClass: 'activated',
			figureClass: 'gallery-figure',
			figcaptionClass: 'figcaption',
			captionClass: 'caption',
			titleClass: 'title',
			bgColor: '#000',
			transitionEffect: 'slide',
			enableMouseSlide: false,
			enableTouchSlide: true,
			touchMargin: 0.32,
			touchMoveDetect: 15
		};
	}

	$.extend(CFGallery.prototype, {

		_supportedEffects: ['slide', 'crossfade', 'fade'],

		_initGallery: function(gallery, settings) {

			var inst = {
				gallery: $(gallery),
				stage: $([]),
				thumbs: $([]),
				images: $([]),
				settings: $.extend({}, settings || {}),
				currentIndex: parseInt(settings.start) || 0
			}
			
			$.data(gallery, PROP_NAME, inst);
			
			this._initStage(inst);

			this._showImage(inst);

			if (!instActive) {
				instActive = inst;
			}
		},

		_initStage: function(inst) {
			
			// Stage setup. Look for a div if one is provided.
			inst.stage = $('.gallery-stage:first', inst.gallery);

			// Create a stage if not.
			if (!inst.stage.length) {
				inst.stage = $('<div class="gallery-stage" />').appendTo(this);
			}

			inst.thumbs = $('ul a[href][id][data-largesrc]', inst.gallery);

			inst.filmstrip = $('<div class="gallery-filmstrip" />').appendTo(inst.stage);

			inst.loading = $('<div class="loading">Loading...</div>').hide().appendTo(inst.stage);

			this._createFilmstrip(inst);

			this._updateStage(inst);

			var touchSlide = this._get(inst, 'enableTouchSlide') || this._get(inst, 'enableMouseSlide');

			if (touchSlide && this._hasTouchSupport()) {
				inst.settings.transitionEffect = 'slide';
			}

			var transitionEffect = this._get(inst, 'transitionEffect');
			if (!$.support.opacity || $.inArray(transitionEffect, this._supportedEffects) == -1) {			
				transitionEffect = inst.settings.transitionEffect = 'fade';
			}

			if (transitionEffect == 'slide') {

				inst.touch = {
					isWebkit: this._hasWebkitTransform()
				};

				var stageDimensions = $.cfgallery._get(inst, 'stageDimensions');
				$.cfgallery._setFilmstripPosition(inst, inst.currentIndex * stageDimensions[0]);
			}

			inst.gallery.addClass(transitionEffect);

			if (inst.images.length > 1) {
				this._attachHandlers(inst);

				if (touchSlide && transitionEffect == 'slide') {
					this._attachTouchHandlers(inst);
				}
			}
		},

		/* Update widget dimensions on load and resize */
		_updateStage: function(inst) {
			var stageDimensions = this._get(inst, 'stageDimensions');
			var bgColor = this._get(inst, 'bgColor');

			inst.stage.css({
				width: stageDimensions[0],
				height: stageDimensions[1],
				'background-color': bgColor
			});

			inst.images.css({
				width: stageDimensions[0],
				height: stageDimensions[1],
				'line-height': stageDimensions[1] + 'px'
			});

			inst.filmstrip.css({
				width: inst.thumbs.length * stageDimensions[0],
				height: stageDimensions[1],
				'background-color': bgColor,
				'overflow' : 'hidden'
			})
		},

		/* Tests for touch event support */
		_hasTouchSupport: function() {
			return (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch);
		},

		/* Browser supports WebKit transform */
		_hasWebkitTransform: function() {
			return ('webkitTransform' in document.body.style);
		},

		/* Attach event handlers for a specific gallery instance */
		_attachHandlers: function(inst) {

			// Bind loading message to image create and loaded events.
			inst.gallery.on('create.cfgal', function() {
				inst.loading.show();
			})
			.on('loaded.cfgal', function() {
				inst.loading.hide();
			})
			.on('load', 'img', function() {
				inst.gallery.trigger('loaded.cfgal');
			});

			// Bind resize event to update control dimensions
			inst.gallery.on('resize.cfgal', function(e, stageWidth, stageHeight) {
				
				// Update settings
				inst.settings.stageDimensions = [stageWidth, stageHeight];

				// Apply new dimensions to stage elements
				$.cfgallery._updateStage(inst);

				// Re-position the current image
				$.cfgallery._showImage(inst, inst.currentIndex);
			});
			
			inst.thumbs.on('click', function() {
				instActive = inst;
				$.cfgallery._showImage(inst, this);
				$.cfgallery._setHash(inst);
				return false;
			});

			inst.stage.on('click', function() {
				if (!inst.isMoving) {
					instActive = inst;
					$.cfgallery._showImageNext(inst);
					$.cfgallery._setHash(inst);
				}
			});
		},

		_attachTouchHandlers: function(inst) {

			inst.touch = {
				startPageX: 0,
				startFilmstrip: 0,
				startScrollTop: 0,
				moveDetect: this._get(inst, 'touchMoveDetect'),
				isWebkit: this._hasWebkitTransform()
			};

			if (this._get(inst, 'enableTouchSlide') && this._hasTouchSupport()) {
				inst.filmstrip.on('touchstart', inst, this._onTouchStartHandler)
					.on('touchend', inst, this._onTouchEndHandler)
					.on('touchcancel', function() {
						$.cfgallery._disableTouchMoveHandler(inst);

						// Revert to original position
						$.cfgallery._setFilmstripPosition(inst, inst.touch.startFilmstrip);
					});
			}

			if (this._get(inst, 'enableMouseSlide')) {
				inst.filmstrip.on('mousedown', inst, this._onTouchStartHandler)
					.on('mouseup mouseout', inst, this._onTouchEndHandler);
			}
		},

		_onTouchStartHandler: function(e) {
			var inst = e.data;
			if (inst) {
				
				instActive = inst;

				inst.isMoving = false;
				inst.isScrolling = false;

				inst.touch.startPageX = $.cfgallery._getPageX(e);
				inst.touch.startFilmstrip = $.cfgallery._getFilmstripPosition(inst);
				inst.touch.startScrollTop = $(window).scrollTop();
				
				$.cfgallery._enableTouchMoveHandler(inst, e.type);

				if (e.type == 'mousedown') {
					return false;
				}
			}
		},

		_onTouchEndHandler: function(e) {
			var inst = e.data;
			if (inst) {

				$.cfgallery._disableTouchMoveHandler(inst);

				if (inst.isMoving) {

					var currentPosition = $.cfgallery._getFilmstripPosition(inst);
					var stageDimensions = $.cfgallery._get(inst, 'stageDimensions');

					// Calculate current image index based on resulting position
					var diffX = inst.touch.startFilmstrip - currentPosition;
					var minX = stageDimensions[0] * $.cfgallery._get(inst, 'touchMargin');
					
					if (diffX > minX) {
						$.cfgallery._showImageNext(inst);
						return;
					}
					else if (diffX < -minX) {
						$.cfgallery._showImagePrevious(inst);
						return;
					}
				}
				
				$.cfgallery._setFilmstripPosition(inst, inst.touch.startFilmstrip);
			}
		},

		_onTouchMoveHandler: function(e) {
			var inst = e.data;
			if (inst && inst.touch.enabled && !inst.isScrolling) {
				var diffX = parseInt($.cfgallery._getPageX(e) - inst.touch.startPageX);

				// Number of pixels the cursor needs to move to be considered moving horizontally
				if (inst.isMoving || Math.abs(diffX) > inst.touch.moveDetect) {
					inst.isMoving = true;

					if (!inst.moveDirection) {
						inst.moveDirection = diffX > 0 ? inst.touch.moveDetect : -inst.touch.moveDetect;
					}

					var time = new Date().getTime();

					if (!inst.lastMove || time - inst.lastMove > 50) {
						inst.lastMove = time;
						
						$.cfgallery._setFilmstripPosition(inst, inst.touch.startFilmstrip + diffX + inst.moveDirection);
					}
					else {
						inst.touch.filmstripPosition = inst.touch.startFilmstrip + diffX;
					}

					return false;
				}
				else if (Math.abs( $(window).scrollTop() - inst.touch.startScrollTop ) > 30) {
					inst.isScrolling = true;
				}
			}
		},

		_enableTouchMoveHandler: function(inst, eventType) {
			if (!inst.touch.enabled) {
				inst.touch.enabled = true;

				inst.gallery.addClass('gallery-touch gallery-touch-active');

				var moveEvent = eventType && eventType.indexOf('touch') === 0 ? 'touchmove' : 'mousemove';
				
				$(window).on(moveEvent, inst, this._onTouchMoveHandler);
			}
		},

		_disableTouchMoveHandler: function(inst) {
			if (inst.touch.enabled) {
				inst.touch.enabled = false;

				$(window).off('touchmove mousemove', this._onTouchMoveHandler);
				
				inst.gallery.removeClass('gallery-touch-active');
			}
		},

		/* Get the X position of the cursor: mouse pointer or touch location */
		_getPageX: function(e) {
			return e.type.indexOf('touch') === 0 ? e.originalEvent.touches[0].pageX : e.pageX;
		},

		/**
		 * Sets the slide position of the filmstrip
		 * Webkit will occasionally stutter when both -webkit-transform and transform are set
		 */
		_setFilmstripPosition: function(inst, x) {
			if (inst.touch && inst.touch.isWebkit) {
				inst.filmstrip.css('-webkit-transform', 'translate(' + x + 'px, 0px)');
			}
			else {
				inst.filmstrip.css('transform', 'translate(' + x + 'px, 0px)');
			}
			
			if (inst.touch) {
				inst.touch.filmstripPosition = x;
			}
		},

		_getFilmstripPosition: function(inst) {
			if (inst.touch && inst.touch.filmstripPosition !== undefined) {
				return inst.touch.filmstripPosition;
			}
			var transform;
			if (inst.touch.isWebkit) {
				transform = inst.filmstrip.css('-webkit-transform');
			}
			else {
				transform = inst.filmstrip.css('transform');
			}
			if (transform) {
				var transformSplit = transform.split(',');
				if (transformSplit.length > 4) {
					return parseInt(transformSplit[4]);
				}
			}

			return 0;
		},

		/* Get a setting value, defaulting if necessary. */
		_get: function(inst, name) {
			return inst.settings[name] !== undefined ?
				inst.settings[name] : this._defaults[name];
		},

		/* Global location hash change event handler */
		_checkHashchange: function() {
			if (instActive) {
				$.cfgallery._showImage(instActive);
			}
		},

		/* Global keypress event handling */
		_checkExternalKeydown: function(e) {
			if (instActive) {
				// Right arrow
				if (e.which === 39) {
					$.cfgallery._showImageNext(instActive);
				}
				// Left arrow
				else if (e.which === 37) {
					$.cfgallery._showImagePrevious(instActive);
				}
			}
		},

		/* Show image using thumbnail or index for lookup, or, if set, current hash value, else first available image */
		_showImage: function(inst, thumb, transitionEffect) {

			// Check hash if image not provided
			if (thumb === undefined) {
				
				var hash = this.getHashToken();
				
				if (hash == inst.currentHash) {
					return;
				}

				if (hash && hash != '') {
					inst.thumbs.each(function(i) {
						if ($(this).prop('id') == hash) {
							thumb = i;
							return false;
						}
					});
				}
			}

			// Use start index if hash id is unknown
			if (thumb === undefined) {
				thumb = this._get(inst, 'start');
				if (!$.isNumeric(thumb) || thumb >= inst.images.length) {
					thumb = 0;
				}
			}

			var index = $.isNumeric(thumb) ? thumb : $.inArray(thumb, inst.thumbs);
			if (index !== -1 && index < inst.images.length) {

				this._loadImage(inst, index);

				var activatedClass = this._get(inst, 'activatedClass');
				transitionEffect = transitionEffect || this._get(inst, 'transitionEffect');

				if (transitionEffect == 'slide') {
					var stageDimensions = this._get(inst, 'stageDimensions');
					this._setFilmstripPosition(inst, -stageDimensions[0] * index);
				}
				else {
					this._setFilmstripPosition(inst, 0);
				}

				inst.images.removeClass(activatedClass)
						.eq(index).addClass(activatedClass);
				
				inst.thumbs.removeClass(activatedClass)
					.eq(index).addClass(activatedClass);
				
				inst.currentIndex = index;

				this._loadImage(inst, index + 1);
				this._loadImage(inst, index - 1);
			}
		},

		_showImagePrevious: function(inst) {
			if (--inst.currentIndex < 0) {
				inst.currentIndex = inst.images.length - 1;
			}
			this._showImage(inst, inst.currentIndex);
		},

		_showImageNext: function(inst) {
			if (++inst.currentIndex >= inst.images.length) {
				inst.currentIndex = 0;
			}
			this._showImage(inst, inst.currentIndex);
		},

		_createFilmstrip: function(inst) {
			var items = [];
			inst.thumbs.each(function() {
				items.push($.cfgallery._createFigure(inst, this));
			});

			inst.images = $(items).map(function() {return this.toArray();});

			inst.filmstrip.append(inst.images);
		},

		_setHash: function(inst) {
			inst.currentHash = inst.thumbs.eq(inst.currentIndex).prop('id');
			this.setHashToken(inst.currentHash);
		},
		
		/* Get ID token from hash string */
		getHashToken: function(location) {
			var l = location || window.location.hash;
			if (!l) {
				return '';
			}
			return l.slice(2);
		},

		/* Set hash without jumping */
		setHashToken: function(str) {
			window.location.hash = this.makeHashToken(str);
		},
		
		/* hash without jumping by prepending / to text */
		makeHashToken: function(str) {
			return '#/' + str;
		},
		
		/* Run this on DOMReady or similar
		Turns URLs with hashes anchored to gallery thumbs into #/foo URLs */
		patchHashToken: function(thumbs) {
			var l = window.location.hash;
			if (l.length && l.indexOf('#/') === -1 && $(l, thumbs).length > 0) {
				window.location.hash = this.makeHashToken(l.replace('#', ''));
			}
		},
		
		_getImageData: function($thumb) {
			var title = $thumb.data('title'),
				caption = $thumb.data('caption');

			/* Favor title if they're the same */
			if (title === caption) {
				caption = '';
			}

			return {
				src: $thumb.data('largesrc'),
				title: title,
				caption: caption
			};
		},

		_loadImage: function(inst, index) {

			if (index >= inst.images.length) {
				return;
			}
			else if (index < 0) {
				return;
			}

			var figure = inst.images.eq(index);
			if (figure && figure.length) {
				var largesrc = figure.data('largesrc');
				if (largesrc && largesrc != '' && !$('img', figure).length) {
					var img = $('<img />').prependTo(figure);
					img.prop('src', largesrc);
				}
			}
		},
		
		_createFigure: function (inst, thumb) {
			var $thumb = $(thumb),
				data = this._getImageData($thumb),
				$figure, $figcaption;

			$figure = $('<figure/>').addClass(this._get(inst, 'figureClass'))
				.data('largesrc', data.src);

			if (data.title || data.caption) {
				$figcaption = $('<figcaption/>')
					.addClass(this._get(inst, 'figcaptionClass'));
				
				if (data.title) {
					$('<div />')
						.addClass(this._get(inst, 'titleClass'))
						.html(data.title)
						.appendTo($figcaption);
				}

				if (data.caption) {
					 $('<div />')
						.addClass(this._get(inst, 'captionClass'))
						.html(data.caption)
						.appendTo($figcaption);
				}

				$figcaption.appendTo($figure);
			}
			
			return $figure;
		},

		/**
		 * Proportional scale for image dimensions.
		 * @param array dims [w,h]
		 * @param array boundaries [w,h]
		 * @return array scaled [w,h]
		 */
		scale: function(dims, boundaries) {
			var factor,
				/* @param bywidth: true = width, false = height */
				scaleby = function(bywidth) {
					var x, y;
					if (bywidth) {
						x = 0;
						y = 1;
					}
					else {
						x = 1;
						y = 0;
					}

					factor = boundaries[x] / dims[x];
					dims[x] = boundaries[x];
					dims[y] = Math.ceil(dims[y] * factor);
					return dims;
				};
			if (dims[0] > boundaries[0]) {
				return scaleby(true);
			};
			if (dims[1] > boundaries[1]) {
				return scaleby(false);
			};
			return dims;
		},
		
		/* Copyright (c) 2011 Jed Schmidt, http://jed.is
		https://gist.github.com/964849
		Released under MIT license */
		parseUrl: function(a){return function(b,c,d){a.href=b;c={};for(d in a)if(typeof a[d]=="string")c[d]=a[d];return c}}(document.createElement("a"))
	});

	$.fn.cfgallery = function(options) {
		if ( !this.length ) {
			return this;
		}

		// Initialize global event handlers
		if (!$.cfgallery.initialized) {
			$(document).on('keydown', $.cfgallery._checkExternalKeydown);
			$(window).on('hashchange', $.cfgallery._checkHashchange);
			$.cfgallery.initialized = true;
		}
		
		return this.each(function() {
			$.cfgallery._initGallery(this, options);
		});
	}

	$.cfgallery = new CFGallery();
	$.cfgallery.initialized = false;

	for (var fn in $.cfgallery) {
		if (fn.charAt(0) != '_') {
			var helper = {};
			helper[fn] = $.cfgallery[fn];
			$.fn.cfgallery.helpers = $.extend($.fn.cfgallery.helpers || {}, helper);
		}
	}

	$.fn.cfShimLinkHash = function() {
		if (this.length > 0) {
			this.filter('a').each(function(){
				var t = $(this),
					a = $.cfgallery.parseUrl(t.attr('href')),
					token = $.cfgallery.makeHashToken(a.hash.replace('#', ''));
					t.attr('href', a.href.replace(a.hash, token));
			});
		};
	};

	$(function() {
		$.cfgallery.patchHashToken();
	});
})(jQuery);

/*!
 * jQuery hashchange event - v1.3 - 7/21/2010
 * http://benalman.com/projects/jquery-hashchange-plugin/
 *
 * Copyright (c) 2010 "Cowboy" Ben Alman
 * Dual licensed under the MIT and GPL licenses.
 * http://benalman.com/about/license/
 */
;(function($,e,b){var c="hashchange",h=document,f,g=$.event.special,i=h.documentMode,d="on"+c in e&&(i===b||i>7);function a(j){j=j||location.href;return"#"+j.replace(/^[^#]*#?(.*)$/,"$1")}$.fn[c]=function(j){return j?this.bind(c,j):this.trigger(c)};$.fn[c].delay=50;g[c]=$.extend(g[c],{setup:function(){if(d){return false}$(f.start)},teardown:function(){if(d){return false}$(f.stop)}});f=(function(){var j={},p,m=a(),k=function(q){return q},l=k,o=k;j.start=function(){p||n()};j.stop=function(){p&&clearTimeout(p);p=b};function n(){var r=a(),q=o(m);if(r!==m){l(m=r,q);$(e).trigger(c)}else{if(q!==m){location.href=location.href.replace(/#.*/,"")+q}}p=setTimeout(n,$.fn[c].delay)}$.browser.msie&&!d&&(function(){var q,r;j.start=function(){if(!q){r=$.fn[c].src;r=r&&r+a();q=$('<iframe tabindex="-1" title="empty"/>').hide().one("load",function(){r||l(a());n()}).attr("src",r||"javascript:0").insertAfter("body")[0].contentWindow;h.onpropertychange=function(){try{if(event.propertyName==="title"){q.document.title=h.title}}catch(s){}}}};j.stop=k;o=function(){return a(q.location.href)};l=function(v,s){var u=q.document,t=$.fn[c].domain;if(v!==s){u.title=h.title;u.open();t&&u.write('<script>document.domain="'+t+'"<\/script>');u.close();q.location.hash=v}}})();return j})()})(jQuery,this);

