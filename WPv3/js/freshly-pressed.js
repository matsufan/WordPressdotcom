(function () {
	"use strict";

	// This function is called whenever a user navigates to this page. It
    // populates the page elements with the app's data.
	function ready(element, options) {
		// TODO: Initialize the fragment here.
        WPCom.populateTabs();
        WPCom.newDataSource('fp');
    	var listview = document.getElementById("fp-list").winControl;
    	listview.itemDataSource = WPCom.dataSources.fp.dataSource;
    	listview.itemTemplate = document.getElementById("freshTemplate");
    	listview.addEventListener('loadingstatechanged', getOlderFP);
    	//WinJS.Utilities.addClass( document.getElementById("loader"), 'hide');
    }

    function getOlderFP(e) {
    	var listview = document.getElementById("fp-list").winControl;
    	if ('itemsLoaded' == listview.loadingState && (listview.indexOfLastVisible + 20) > WPCom.dataSources.fp.post_count && !WPCom.dataSources.fp.fetching)
    		WPCom.dataSources.fp.getData('older');
    }

    WinJS.UI.Pages.define("/html/freshly-pressed.html", {
        ready: ready
    });
})();
