/**
  Usage:
  	- Make sure to load ima3 sdk before this script
	  Example: 
	  	if (enableADS)
		{
			loadOrderScript('//imasdk.googleapis.com/js/sdkloader/ima3.js', 'adsSDK/adsSDK.js');            
		}
	- To display ads using playAds() function. Notice After this script loaded it will playAds() automatic for preroll ads
 */

"use strict";

var adsContainer; // element in index
var adsDisplayContainer; // ima obj
var adsLoader;
var adsManager;

var AdsState = {
	NONE: 0,
	LOADING: 1,
	LOADED: 2,
	STARTED: 3,
	COMPLETE: 4,
};
var totalRequest = 0;
var totalClick = 0;
var timeClick = -1;

var adsCurrentState = AdsState.NONE;
var adsConsoleLog = true;
var _defaultAdUrl = '//googleads.g.doubleclick.net/pagead/ads?ad_type=image_flash&client=ca-games-pub-4052078165537812&description_url=https%3A%2F%2Fplay.ludigames.com%2Fdetails%2F' + productKey + '&videoad_start_delay=0&hl=en'
var _loadedAdUrl = null;		// for keep latest adurl that successfull request


var _adsLog = function(message) {
	if(adsConsoleLog) {
		console.log(message);
	}
}

/**
 * private function to change ads state, you can listen this event if need via 'gl_ads_state_change' event
 * you can also access adsCurrentState direct in your code
*/
var _setAdsState = function (state) {
	var oldState = adsCurrentState;
	adsCurrentState = state;
	window.dispatchEvent(new CustomEvent('gl_ads_state_change', { detail: { oldState: oldState, newState: adsCurrentState } }));
}

var _getWindowSize = function() {
	var size = {};
	var w = window,
		d = document,
		e = d.documentElement,
		g = d.getElementsByTagName('body')[0],
		x = w.innerWidth || e.clientWidth || g.clientWidth,
		y = w.innerHeight || e.clientHeight || g.clientHeight;
	size.width = x;
	size.height = y;
	return size;
}

/**
 * set style fullscreen for ads container
 */
var setFullScreenAdsContainer = function () {
	adsContainer = document.getElementById('adsContainer');
	adsContainer.style.position = 'absolute';
	adsContainer.style.top = "0px";
	adsContainer.style.left = "0px";
	adsContainer.style.width = "100%";
	adsContainer.style.height = "100%";
	adsContainer.style.border = 1 + "px";
	adsContainer.style.display = "none"; // none, inline	
}

var createAdDisplayContainer = function () {
	// We assume the adContainer is the DOM id of the element that will house the ads.
	if(adsDisplayContainer == null) {
		adsDisplayContainer = new google.ima.AdDisplayContainer(adsContainer);
		adsDisplayContainer.initialize();
	}
}

/**
 * playing ads
 */
var playAds = function () {

	// ads still display -> return
	if (adsContainer.style.display == "inline") {
		_adsLog('playAds. adsContainer = inline, return: ');
		return;
	}
	totalRequest += 1;

	_setAdsState(AdsState.LOADING);

	parent['dataLayer'].push({
		'productKey': productKey,
		'event': 'sectionRequestAds'
	});

	adsContainer.style.display = "inline";

	// check for cleanup for request
	if(adsManager != null) {
		if(_loadedAdUrl != null) {
			timeClick = Date.now();
			adsManager.start();		// play/replay cached ads
		} else {	// request ads for new size
			adsManager.destroy();
			adsManager = null;
			adsLoader.contentComplete();	// resets the SDK so the new ad request doesn't look like a duplicate of the previous one.
			requestAds();
		}
		
	} else {	// first time display ads or it failed on previous time
		createAdDisplayContainer();
		adsLoader = new google.ima.AdsLoader(adsDisplayContainer);
		// Listen and respond to ads adsJSLoaded and error events.
		adsLoader.addEventListener(
			google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
			onAdsManagerLoaded,
			false);
		adsLoader.addEventListener(
			google.ima.AdErrorEvent.Type.AD_ERROR,
			onAdLoaderError,
			false);

		requestAds();
	}
}

/**
 * request ads and caching it. It recomment to call it 1 time only
 */
var requestAds = function() {
	var adsRequest = new google.ima.AdsRequest();
	parent['dataLayer'].push({
		'adNetwork': 'AFG',
		'adPosition': 'pre-roll',
		'adHtmlContainer': 'freeContainer',
		'adDescriptionUrl': 'https%3A%2F%2Fplay.ludigames.com%2Fdetails%2F' + productKey, // URL encoded
		'event': 'displayAd'
	});
	if(parent['adUrl']) {
		parent['adUrl'] = parent['adUrl'].replace("image_text", "image");
		_loadedAdUrl = parent['adUrl'];
	}
	adsRequest.adTagUrl = parent['adUrl'] || _loadedAdUrl || _defaultAdUrl;
	_adsLog('requestAds. adTagUrl: ' + adsRequest.adTagUrl);

	var size = _getWindowSize();

	_adsLog('requestAds size: ' + size.width + ", " + size.height);
	adsRequest.linearAdSlotWidth = size.width;
	adsRequest.linearAdSlotHeight = size.height;

	adsRequest.nonLinearAdSlotWidth = size.width;
	adsRequest.nonLinearAdSlotHeight = size.height;

	adsRequest.forceNonLinearFullSlot = true;

	adsLoader.requestAds(adsRequest);
}

var onAdsManagerLoaded = function (adsManagerLoadedEvent) {

	adsManager = adsManagerLoadedEvent.getAdsManager(adsDisplayContainer);

	// Add listeners to the required events.
	adsManager.addEventListener(
		google.ima.AdErrorEvent.Type.AD_ERROR,
		onAdManagerError);
	
	var events = [
		google.ima.AdEvent.Type.ALL_ADS_COMPLETED,
		// google.ima.AdEvent.Type.CLICK,
		google.ima.AdEvent.Type.COMPLETE,
		// google.ima.AdEvent.Type.FIRST_QUARTILE,
		google.ima.AdEvent.Type.LOADED,
		// google.ima.AdEvent.Type.MIDPOINT,
		// google.ima.AdEvent.Type.PAUSED,
		google.ima.AdEvent.Type.STARTED,
		// google.ima.AdEvent.Type.THIRD_QUARTILE,
		google.ima.AdEvent.Type.USER_CLOSE,
		google.ima.AdEvent.Type.CLICK
	];

	for (var index in events) {
		adsManager.addEventListener(
			events[index],
			onAdEvent,
			false);
	  }

	try {
		var size = _getWindowSize();
		_adsLog("playAds (w,h): " + size.width + ", " + size.height);
		adsManager.init(size.width, size.height, google.ima.ViewMode.FULLSCREEN);
		adsManager._s = {w:size.width, h: size.height};
		
		// Call play to start showing the ad. Single video and overlay ads will
		// start at this time; the call will be ignored for ad rules.
		timeClick = Date.now();
		adsManager.start();
	} catch(adError) {
		adsContainer.style.display = "none";
		_setAdsState(AdsState.COMPLETE);
		_adsLog("playAds adError: " + adError);

		parent['dataLayer'].push({
			'productKey': productKey,
			'event': 'sectionPlayAdsError'
		});
	}
}

/** ad play event handle */
var onAdEvent = function (adEvent) {
	var ad = adEvent.getAd();
	switch (adEvent.type) {
		case google.ima.AdEvent.Type.LOADED:
			// this event is not fire when cached ads play
			var w = adEvent.getAd().getVastMediaWidth();
			var h = adEvent.getAd().getVastMediaHeight();
			_adsLog("onAdEvent LOADED media size: " + w + " , " + h);
			_adsLog("ad.isLinear(): " + ad.isLinear());
			_setAdsState(AdsState.LOADED);; //
			break;
		case google.ima.AdEvent.Type.STARTED:
			// this event is not fire when cached ads play
			_adsLog("onAdEvent STARTED");

			timeClick = Date.now();
			_setAdsState(AdsState.STARTED);
			parent['dataLayer'].push({
				'productKey': productKey,
				'event': 'sectionAdsStarted',
				'param1': totalRequest
			});
			break;
		case google.ima.AdEvent.Type.COMPLETE:
		case google.ima.AdEvent.Type.USER_CLOSE:
			_adsLog("onAdEvent COMPLETE/USER_CLOSE");
			parent['dataLayer'].push({
				'productKey': productKey,
				'event': 'sectionShowAds',
				'param1': totalRequest
			});

			_setAdsState(AdsState.COMPLETE); //		
			adsContainer.style.display = "none";
			break;
		case google.ima.AdEvent.Type.CLICK:
			totalClick += 1;
			timeClick = (Date.now() - timeClick)/1000;
			parent['dataLayer'].push({
				'productKey': productKey,
				'event': 'sectionAdClick',
				'param1': totalRequest,
				'param2': totalClick,
				'countTimeClick': timeClick
			});
			break;
	}
}

/** error handle when start ads */
var onAdManagerError = function (adErrorEvent) {
	// Handle the error logging.
	_adsLog("onAdManagerError " + adErrorEvent.getError());
	if (adsManager) {
		adsManager.destroy();
	}
	adsManager = null;
	_setAdsState(AdsState.COMPLETE);
	adsContainer.style.display = "none";
	var size = _getWindowSize();
	parent['dataLayer'].push({
		'productKey': productKey,
		'event': 'sectionAdManagerError',
		'param1': adErrorEvent.getError().getErrorCode()
	});
}

/** error handle when request ads */
var onAdLoaderError = function (adErrorEvent) {
	// Handle the error logging.
	_adsLog("onAdLoaderError " + adErrorEvent.getError());
	if (adsManager) {
		adsManager.destroy();
	}
	adsManager = null;
	_setAdsState(AdsState.COMPLETE);
	adsContainer.style.display = "none";
	var size = _getWindowSize();
	parent['dataLayer'].push({
		'productKey': productKey,
		'event': 'sectionAdLoaderError',
		'param1': adErrorEvent.getError().getErrorCode()
	});
}

/**
 * init ads sdk
 */
var _initialize = function () {
	setFullScreenAdsContainer();

	// handle orientation
	window.addEventListener("resize", function() {
		if(adsManager) {
			var size = _getWindowSize();
			var o1 = size.width < size.height ? 0 : 1;
			var o2 = adsManager._s.w < adsManager._s.h ? 0 : 1;
			if(o1 != o2) {
				var s = adsManager._s;
				adsManager.resize(s.h, s.w, google.ima.ViewMode.FULLSCREEN);
				adsManager._s = {w: s.h, h: s.w};
			}
		}
	});
}



_initialize();
_adsLog("adsSDK v009 loaded");


playAds();
