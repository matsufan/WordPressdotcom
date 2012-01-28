(function () {
	"use strict";

	// This function is called whenever a user navigates to this page. It
    // populates the page elements with the app's data.
	function ready(element, options) {
		// TODO: Initialize the fragment here.
		WPCom.toggleElement(document.getElementById('refresh'), 'show');
		WPCom.toggleElement(document.getElementById('openinbrowser'), 'hide');

		WPCom.populateTabs();
		WPCom.newDataSource('fp');
		var listview = document.getElementById("fp-list").winControl;
		listview.itemDataSource = WPCom.dataSources.fp.dataSource;
    	listview.itemTemplate = document.getElementById("freshTemplate");

    	if (WPCom.dataSources.fp.scrollPosition > 0)
    		listview.addEventListener('loadingstatechanged', scrollToPosition);
    	listview.addEventListener('loadingstatechanged', getOlderFP);
	}

	function getOlderFP(e) {
		if ( document.getElementById('fp-list') ) {
			var listview = document.getElementById("fp-list").winControl;
			if ('itemsLoaded' == listview.loadingState && (listview.indexOfLastVisible + 1 + WPCom.getDefaultPostCount()) >= WPCom.dataSources.fp.list.length && !WPCom.dataSources.fp.fetching)
				WPCom.dataSources.fp.getData('older');
			else if ('complete' == listview.loadingState)
				WPCom.dataSources.fp.scrollPosition = listview.scrollPosition;
		}
    }

    function scrollToPosition(e) {
    	var listview = document.getElementById("fp-list").winControl;
    	var pos = WPCom.dataSources.fp.scrollPosition;

    	if ('complete' == listview.loadingState) {
    		if (pos > 0)
    			listview.scrollPosition = pos;
    		listview.removeEventListener('loadingstatechanged', scrollToPosition);
    	}
    }

    WinJS.UI.Pages.define("/html/freshly-pressed.html", {
        ready: ready
    });
})();
