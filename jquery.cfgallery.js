/*!
 * cfgallery - a light-weight, semantic gallery script with bookmarkable slides.
 *
 * Copyright (c) Crowd Favorite
 *
 * Uses:
 *
 * jQuery hashchange event - v1.3 - 7/21/2010
 * http://benalman.com/projects/jquery-hashchange-plugin/
 *
 * Copyright (c) 2010 "Cowboy" Ben Alman
 * Dual licensed under the MIT and GPL licenses.
 * http://benalman.com/about/license/
 */
;(function($,window,undefined){
	'$:nomunge'; // Used by YUI compressor.
	
	// Reused string.
	var str_hashchange = 'hashchange',
		
		// Method / object references.
		doc = document,
		fake_onhashchange,
		special = $.event.special,
		
		// Does the browser support window.onhashchange? Note that IE8 running in
		// IE7 compatibility mode reports true for 'onhashchange' in window, even
		// though the event isn't supported, so also test document.documentMode.
		doc_mode = doc.documentMode,
		supports_onhashchange = 'on' + str_hashchange in window && ( doc_mode === undefined || doc_mode > 7 );
	
	// Get location.hash (or what you'd expect location.hash to be) sans any
	// leading #. Thanks for making this necessary, Firefox!
	function get_fragment( url ) {
		url = url || location.href;
		return '#' + url.replace( /^[^#]*#?(.*)$/, '$1' );
	};
	
	// Method: jQuery.fn.hashchange
	// 
	// Bind a handler to the window.onhashchange event or trigger all bound
	// window.onhashchange event handlers. This behavior is consistent with
	// jQuery's built-in event handlers.
	// 
	// Usage:
	// 
	// > jQuery(window).hashchange( [ handler ] );
	// 
	// Arguments:
	// 
	//	handler - (Function) Optional handler to be bound to the hashchange
	//		event. This is a "shortcut" for the more verbose form:
	//		jQuery(window).bind( 'hashchange', handler ). If handler is omitted,
	//		all bound window.onhashchange event handlers will be triggered. This
	//		is a shortcut for the more verbose
	//		jQuery(window).trigger( 'hashchange' ). These forms are described in
	//		the <hashchange event> section.
	// 
	// Returns:
	// 
	//	(jQuery) The initial jQuery collection of elements.
	
	// Allow the "shortcut" format $(elem).hashchange( fn ) for binding and
	// $(elem).hashchange() for triggering, like jQuery does for built-in events.
	$.fn[ str_hashchange ] = function( fn ) {
		return fn ? this.bind( str_hashchange, fn ) : this.trigger( str_hashchange );
	};
	
	// Property: jQuery.fn.hashchange.delay
	// 
	// The numeric interval (in milliseconds) at which the <hashchange event>
	// polling loop executes. Defaults to 50.
	
	// Property: jQuery.fn.hashchange.domain
	// 
	// If you're setting document.domain in your JavaScript, and you want hash
	// history to work in IE6/7, not only must this property be set, but you must
	// also set document.domain BEFORE jQuery is loaded into the page. This
	// property is only applicable if you are supporting IE6/7 (or IE8 operating
	// in "IE7 compatibility" mode).
	// 
	// In addition, the <jQuery.fn.hashchange.src> property must be set to the
	// path of the included "document-domain.html" file, which can be renamed or
	// modified if necessary (note that the document.domain specified must be the
	// same in both your main JavaScript as well as in this file).
	// 
	// Usage:
	// 
	// jQuery.fn.hashchange.domain = document.domain;
	
	// Property: jQuery.fn.hashchange.src
	// 
	// If, for some reason, you need to specify an Iframe src file (for example,
	// when setting document.domain as in <jQuery.fn.hashchange.domain>), you can
	// do so using this property. Note that when using this property, history
	// won't be recorded in IE6/7 until the Iframe src file loads. This property
	// is only applicable if you are supporting IE6/7 (or IE8 operating in "IE7
	// compatibility" mode).
	// 
	// Usage:
	// 
	// jQuery.fn.hashchange.src = 'path/to/file.html';
	
	$.fn[ str_hashchange ].delay = 50;
	/*
	$.fn[ str_hashchange ].domain = null;
	$.fn[ str_hashchange ].src = null;
	*/
	
	// Event: hashchange event
	// 
	// Fired when location.hash changes. In browsers that support it, the native
	// HTML5 window.onhashchange event is used, otherwise a polling loop is
	// initialized, running every <jQuery.fn.hashchange.delay> milliseconds to
	// see if the hash has changed. In IE6/7 (and IE8 operating in "IE7
	// compatibility" mode), a hidden Iframe is created to allow the back button
	// and hash-based history to work.
	// 
	// Usage as described in <jQuery.fn.hashchange>:
	// 
	// > // Bind an event handler.
	// > jQuery(window).hashchange( function(e) {
	// >	 var hash = location.hash;
	// >	 ...
	// > });
	// > 
	// > // Manually trigger the event handler.
	// > jQuery(window).hashchange();
	// 
	// A more verbose usage that allows for event namespacing:
	// 
	// > // Bind an event handler.
	// > jQuery(window).bind( 'hashchange', function(e) {
	// >	 var hash = location.hash;
	// >	 ...
	// > });
	// > 
	// > // Manually trigger the event handler.
	// > jQuery(window).trigger( 'hashchange' );
	// 
	// Additional Notes:
	// 
	// * The polling loop and Iframe are not created until at least one handler
	//	 is actually bound to the 'hashchange' event.
	// * If you need the bound handler(s) to execute immediately, in cases where
	//	 a location.hash exists on page load, via bookmark or page refresh for
	//	 example, use jQuery(window).hashchange() or the more verbose 
	//	 jQuery(window).trigger( 'hashchange' ).
	// * The event can be bound before DOM ready, but since it won't be usable
	//	 before then in IE6/7 (due to the necessary Iframe), recommended usage is
	//	 to bind it inside a DOM ready handler.
	
	// Override existing $.event.special.hashchange methods (allowing this plugin
	// to be defined after jQuery BBQ in BBQ's source code).
	special[ str_hashchange ] = $.extend( special[ str_hashchange ], {
		
		// Called only when the first 'hashchange' event is bound to window.
		setup: function() {
			// If window.onhashchange is supported natively, there's nothing to do..
			if ( supports_onhashchange ) { return false; }
			
			// Otherwise, we need to create our own. And we don't want to call this
			// until the user binds to the event, just in case they never do, since it
			// will create a polling loop and possibly even a hidden Iframe.
			$( fake_onhashchange.start );
		},
		
		// Called only when the last 'hashchange' event is unbound from window.
		teardown: function() {
			// If window.onhashchange is supported natively, there's nothing to do..
			if ( supports_onhashchange ) { return false; }
			
			// Otherwise, we need to stop ours (if possible).
			$( fake_onhashchange.stop );
		}
		
	});
	
	// fake_onhashchange does all the work of triggering the window.onhashchange
	// event for browsers that don't natively support it, including creating a
	// polling loop to watch for hash changes and in IE 6/7 creating a hidden
	// Iframe to enable back and forward.
	fake_onhashchange = (function(){
		var self = {},
			timeout_id,
			
			// Remember the initial hash so it doesn't get triggered immediately.
			last_hash = get_fragment(),
			
			fn_retval = function(val){ return val; },
			history_set = fn_retval,
			history_get = fn_retval;
		
		// Start the polling loop.
		self.start = function() {
			timeout_id || poll();
		};
		
		// Stop the polling loop.
		self.stop = function() {
			timeout_id && clearTimeout( timeout_id );
			timeout_id = undefined;
		};
		
		// This polling loop checks every $.fn.hashchange.delay milliseconds to see
		// if location.hash has changed, and triggers the 'hashchange' event on
		// window when necessary.
		function poll() {
			var hash = get_fragment(),
				history_hash = history_get( last_hash );
			
			if ( hash !== last_hash ) {
				history_set( last_hash = hash, history_hash );
				
				$(window).trigger( str_hashchange );
				
			} else if ( history_hash !== last_hash ) {
				location.href = location.href.replace( /#.*/, '' ) + history_hash;
			}
			
			timeout_id = setTimeout( poll, $.fn[ str_hashchange ].delay );
		};
		
		// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
		// vvvvvvvvvvvvvvvvvvv REMOVE IF NOT SUPPORTING IE6/7/8 vvvvvvvvvvvvvvvvvvv
		// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
		$.browser.msie && !supports_onhashchange && (function(){
			// Not only do IE6/7 need the "magical" Iframe treatment, but so does IE8
			// when running in "IE7 compatibility" mode.
			
			var iframe,
				iframe_src;
			
			// When the event is bound and polling starts in IE 6/7, create a hidden
			// Iframe for history handling.
			self.start = function(){
				if ( !iframe ) {
					iframe_src = $.fn[ str_hashchange ].src;
					iframe_src = iframe_src && iframe_src + get_fragment();
					
					// Create hidden Iframe. Attempt to make Iframe as hidden as possible
					// by using techniques from http://www.paciellogroup.com/blog/?p=604.
					iframe = $('<iframe tabindex="-1" title="empty"/>').hide()
						
						// When Iframe has completely loaded, initialize the history and
						// start polling.
						.one( 'load', function(){
							iframe_src || history_set( get_fragment() );
							poll();
						})
						
						// Load Iframe src if specified, otherwise nothing.
						.attr( 'src', iframe_src || 'javascript:0' )
						
						// Append Iframe after the end of the body to prevent unnecessary
						// initial page scrolling (yes, this works).
						.insertAfter( 'body' )[0].contentWindow;
					
					// Whenever `document.title` changes, update the Iframe's title to
					// prettify the back/next history menu entries. Since IE sometimes
					// errors with "Unspecified error" the very first time this is set
					// (yes, very useful) wrap this with a try/catch block.
					doc.onpropertychange = function(){
						try {
							if ( event.propertyName === 'title' ) {
								iframe.document.title = doc.title;
							}
						} catch(e) {}
					};
					
				}
			};
			
			// Override the "stop" method since an IE6/7 Iframe was created. Even
			// if there are no longer any bound event handlers, the polling loop
			// is still necessary for back/next to work at all!
			self.stop = fn_retval;
			
			// Get history by looking at the hidden Iframe's location.hash.
			history_get = function() {
				return get_fragment( iframe.location.href );
			};
			
			// Set a new history item by opening and then closing the Iframe
			// document, *then* setting its location.hash. If document.domain has
			// been set, update that as well.
			history_set = function( hash, history_hash ) {
				var iframe_doc = iframe.document,
					domain = $.fn[ str_hashchange ].domain;
				
				if ( hash !== history_hash ) {
					// Update Iframe with any initial `document.title` that might be set.
					iframe_doc.title = doc.title;
					
					// Opening the Iframe's document after it has been closed is what
					// actually adds a history entry.
					iframe_doc.open();
					
					// Set document.domain for the Iframe document as well, if necessary.
					domain && iframe_doc.write( '<script>document.domain="' + domain + '"</script>' );
					
					iframe_doc.close();
					
					// Update the Iframe's hash, for great justice.
					iframe.location.hash = hash;
				}
			};
			
		})();
		// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
		// ^^^^^^^^^^^^^^^^^^^ REMOVE IF NOT SUPPORTING IE6/7/8 ^^^^^^^^^^^^^^^^^^^
		// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
		
		return self;
	})();
	
})(jQuery,this);

/**
 * cfgallery - a light-weight, semantic gallery script with bookmarkable slides.
 */
;(function ($, win) {
	/* Local variable for hash makes lookups faster and is better for closure compiler */
	var loc = win.location,
		docEl = win.document.documentElement,
		gal, helpers;
	
	/* Constructor */
	gal = function(options) {
		var opts = $.extend(gal.opts, options),
			fn = gal.helpers,
			dim = opts.stageDimensions,
			bgColor = opts.bgColor,
			stage;
			
		gal.opts = opts;

		if (this.length < 1) {
			return;
		};
		
		// Memoize gallery and thumbs for use later.
		fn.$gal = this;
		fn.$thumbs = this.find('ul a[href][id][data-largesrc]');
		
		// Stage setup. Look for a div if one is provided.
		stage = this.find('.gallery-stage');
		// Create a stage if not.
		if (stage.length < 1) {
			stage = $('<div class="gallery-stage" />');
			this.prepend(stage);
		};
		stage.css({
			'position': 'relative',
			'width': dim[0],
			'height': dim[1],
			'background-color': bgColor
		});
		fn.$loading = $('<div class="loading">Loading...</div>')
			.hide()
			.appendTo(stage);
		
		fn.$stage = stage;
		
		// Bind thumb click to change hash token
		fn.$thumbs.click(function(e){
			fn.setHashToken($(this).attr('id'));
			e.preventDefault();
		});
		
		stage.click(function (e) {
			fn.setNextHashToken();
			e.preventDefault();
		});
		
		$(docEl).keyup(function(e){
			// Right arrow
			if (e.keyCode === 39) {
				fn.setNextHashToken();
			}
			// Left arrow
			else if (e.keyCode === 37) {
				fn.setPrevHashToken();
			};
		});
		
		$(win)
			.hashchange(function(e){
				/* Change image on hashChange (relies on jquery.hashchange shim) */
				var id = fn.getHashToken();
				fn.exhibit(id);
			})
			.ready(function(){
				fn.patchHashToken();
			})
			.load(function(){
				/* If hash is set onload, show the appropriate image.
				If not, will show the start image. */
				var ht = fn.getHashToken();
				fn.exhibit(ht);
			});

		// Bind loading message to image create and loaded events.
		fn.$stage.bind('create.cfgal', function(e){
			fn.$loading.show();
		});
		fn.$stage.bind('loaded.cfgal', function(e){
			fn.$loading.hide();
		});
	};
	/* Default options for gallery */
	gal.opts = {
		stageDimensions: [710, 474],
		start: 0,
		activatedClass: 'activated',
		figureClass: 'gallery-figure',
		figcaptionClass: 'figcaption',
		captionClass: 'caption',
		titleClass: 'title',
		bgColor: '#000'
	};
	
	/* Helper functions. These live inside of an object so that
	"this" still points to the parent object (constructors the $.fn space get their
	"this" value set to the jQuery collection passed). Object literal object notation also
	compresses down a little better in Closure Compiler. */
	gal.helpers = {
		// $gal: Gallery div jQuery object
		// $stage: Stage div jQuery object
		// $thumbs: thumb array jQuery object
		current: null, // int of active thumb
		
		/* Show an image on the stage by it's thumb's ID token.
		- Loads image if not already loaded
		- Preloads it's siblings afterwords
		- Updates index of this.current */
		exhibit: function(token) {
			var that = this,
				$img,
				$thumb = $( '#' + (token || this.getToken()) ),
				i = this.getThumbIndex($thumb),
				callback;
			
			callback = function (img) {
				var c = gal.opts.activatedClass,
					current = this.current,
					$current;
				
				// Hide old and show new if both are present
				if (current !== null && current !== i) {
					$current = this.getImage(current);
					// Hide others
					this.$stage.children().not($current).hide();
					// Dequeue all animations before starting a new one.
					this.$stage.find('img').stop(true, true);
					this.transitionSlides(img, $current);
				}
				// If there is no current (first load) just show.
				if (current === null) {
					this.transitionSlides(img);
				};
				
				this.$thumbs.removeClass(c);
				$thumb.addClass(c);

				this.preloadNeighbors(i);
				this.current = i;
			};
			
			$img = this.getImage(i);
			if (typeof $img === 'undefined') {
				$img = this.createImage(i);
				$img.bind('loaded.cfgal', function(e) {
					callback.apply(that, [$(e.currentTarget)]);
				});
			}
			else {
				callback.apply(that, [$img]);
			};
		},
		
		/* Allow transition to be overidden using Duck Punching */
		transitionSlides: function ($neue, $old) {
			if ($old !== null && typeof $old !== 'undefined') {
				$old.fadeOut('fast', function(){
					$neue.fadeIn('medium');
				});
			}
			else {
				$neue.fadeIn('medium');
			};
		},
		
		/* Get ID token from hash string */
		getHashToken: function(location) {
			l = location || loc.hash;
			if (!l) {
				return '';
			};
			return l.slice(2);
		},
		
		/* Set hash without jumping */
		setHashToken: function(str) {
			loc.hash = this.makeHashToken(str);
		},
		
		/* hash without jumping by prepending / to text */
		makeHashToken: function(str) {
			return '#/' + str;
		},
		
		/* Run this on DOMReady or similar
		Turns URLs with hashes anchored to gallery thumbs into #/foo URLs */
		patchHashToken: function() {
			var l = loc.hash;
			if (l.indexOf('#/') === -1 && this.$thumbs.filter(l).length > 0) {
				loc.hash = this.makeHashToken(l.replace('#', ''));
			};
		},
		
		setNextHashToken: function() {
			var i,
				max = this.$thumbs.length - 1,
				t;
			if (this.current < max) {
				i = this.current + 1;
			}
			else {
				i = 0;
			};
			t = this.getToken(i);
			this.setHashToken(t);
		},
		
		setPrevHashToken: function() {
			var i,
				max = this.$thumbs.length - 1,
				t;
			if (this.current > 0) {
				i = this.current - 1;
			}
			else {
				i = max;
			};
			t = this.getToken(i);
			this.setHashToken(t);
		},
		
		/*
		Get the index of a thumb jQuery object in the set of thumb objects. */
		getThumbIndex: function($thumb) {
			return this.$thumbs.index($thumb);
		},
		
		getToken: function(i) {
			var a = i || gal.opts.start;
			return this.$thumbs.eq(a).attr('id');
		},
		
		getImage: function(i) {
			return this.$thumbs.eq(i).data('cfgalExpanded');
		},
		
		getImageData: function ($thumb) {
			var $img = $thumb.find('img'),
				title = $img.attr('title'),
				caption = $img.attr('alt');

			/* Favor caption if they're the same */
			if (title === caption) {
				title = '';
			};

			return {
				src: $thumb.data('largesrc'),
				title: title,
				caption: caption
			};
		},
		
		/* Get a full size image jQuery object by it's index.
		If the image doesn't exist yet, this function will create and append it based on the
		thumbnail list markup. */
		createImage: function(i) {
			var data, $img, $wrapper, $title, $caption,
				opts = gal.opts,
				$thumb = this.$thumbs.eq(i),
				// Used in callback
				$stage = this.$stage,
				scale = this.scale;
			
			data = this.getImageData($thumb);
			
			$wrapper = $('<figure/>').addClass(opts.figureClass);

			if (data.title || data.caption) {
				$figcaption = $('<figcaption/>')
					.addClass(opts.figcaptionClass)
					.appendTo($wrapper);
				
				if (data.title) {
					$title = $('<div />')
						.addClass(opts.titleClass)
						.html(data.title)
						.appendTo($figcaption);
				};

				if (data.caption) {
					$caption = $('<div />')
						.addClass(opts.captionClass)
						.html(data.caption)
						.appendTo($figcaption);
				};
			};
			
			$img = this.loadImage(data.src)
				.css({
					/* We have to do a bit of a dance with image hide/show and centering
					Though the image is loaded through loadImage, making its width/height
					info available in most browsers, IE7 doesn't like to give us the w/h
					without the image being shown. We'll load and place it in the stage,
					then after loading is finished, we'll set w/h for centering and switch
					out visibility:hidden for display:none -- that way we can animate the
					image effectively. */
					'position': 'absolute',
					'left': '50%',
					'top': '50%',
					'visibility': 'hidden'
				})
				.trigger('create.cfgal')
				.load(function() {
					var t = $(this),
						dims = scale(
							[t.width(), t.height()],
							[$stage.width(), $stage.height()]
						);
					
					$wrapper.css({
						'width': dims[0],
						'height': dims[1],
						'display': 'none'
					});
					
					t
						.css({
							'width': dims[0],
							'height': dims[1],
							// Add CSS for centering.
							'margin-left': -1 * (dims[0] / 2),
							'margin-top': -1 * (dims[1] / 2),
							'visibility': 'visible'
						})
						.trigger('loaded.cfgal');
				});
			
			$img.prependTo($wrapper);
			$wrapper.appendTo($stage);
			
			$thumb.data('cfgalExpanded', $wrapper);
			return $wrapper;
		},
		
		preloadNeighbors: function(index) {
			var check = [1, 2, -1],
				max = this.$thumbs.length -1,
				i,
				a;
			for (i = check.length - 1; i >= 0; i--){
				a = index + check[i];
				if (a >= 0 && a <= max && !this.getImage(a)) {
					this.createImage(a);
				};
			};
		},

		loadImage: function(src) {
			var img = new Image(),
				$img;
			img.src = src;
			img.alt = "";
			return $(img);
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
	};
	
	// Export gal object as jQuery plugin.
	$.fn.cfgallery = gal;
	
	$.fn.cfShimLinkHash = function() {
		var fn = gal.helpers;
		if (this.length > 0) {
			this.filter('a').each(function(){
				var t = $(this),
					a = fn.parseUrl(t.attr('href')),
					token = fn.makeHashToken(a.hash.replace('#', ''));
					t.attr('href', a.href.replace(a.hash, token));
			});
		};
	};
})(jQuery, window);