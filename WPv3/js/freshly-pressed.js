﻿(function () {
	"use strict";

	function ready(element, options) {
		WinJS.UI.Animation.enterPage(document.querySelector('header'), { top: '0px', left: '200px' });

		WPCom.populateTabs();
		WPCom.newDataSource('freshlypressed');
		var listview = document.getElementById('freshlypressed-list').winControl;
		listview.itemDataSource = WPCom.dataSources.freshlypressed.groupedList.dataSource;
		listview.itemTemplate = document.getElementById('freshlypressedTemplate');
		listview.groupDataSource = WPCom.dataSources.freshlypressed.groupedList.groups.dataSource;
		listview.groupHeaderTemplate = document.getElementById('headerTemplate');

		var listviewZoomout = document.getElementById('freshlypressed-zoomout-list').winControl;
		listviewZoomout.itemDataSource = WPCom.dataSources.freshlypressed.groupedList.groups.dataSource;
		listviewZoomout.itemTemplate = document.getElementById('freshlypressedZoomoutTemplate');

		if (WPCom.dataSources.freshlypressed.scrollPosition > 0) {
    		listview.addEventListener('loadingstatechanged', scrollToPosition);
    		WPCom.toggleLoader('show');
    		WPCom.toggleElement(document.querySelector('.win-surface'), 'hide');
		}
    	listview.addEventListener('loadingstatechanged', getOlderFP);

		// Update the tile if needed.
    	if ( null == WPComTile.data )
    	    WPComTile.init();
	}

	function getOlderFP(e) {
		if ( document.getElementById('freshlypressed-list') ) {
			var listview = document.getElementById('freshlypressed-list').winControl;
			if ('itemsLoaded' == listview.loadingState && (listview.indexOfLastVisible + 1 + WPCom.getDefaultPostCount()) >= WPCom.dataSources.freshlypressed.groupedList.length && !WPCom.dataSources.freshlypressed.fetching)
				WPCom.dataSources.freshlypressed.getData('older');
			else if ('complete' == listview.loadingState)
				WPCom.dataSources.freshlypressed.scrollPosition = listview.scrollPosition;
		}
    }

    function scrollToPosition(e) {
    	var listview = document.getElementById("freshlypressed-list").winControl;
    	var pos = WPCom.dataSources.freshlypressed.scrollPosition;

    	if ('complete' == listview.loadingState) {
    		WPCom.toggleElement(document.querySelector('.win-surface'), 'show');
    		WPCom.toggleLoader('hide');
    		if (pos > 0)
    			listview.scrollPosition = pos;
    		listview.removeEventListener('loadingstatechanged', scrollToPosition);
    	}
    }

    WinJS.UI.Pages.define("/html/freshly-pressed.html", {
        ready: ready
	});
})();
