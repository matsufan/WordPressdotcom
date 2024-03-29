﻿(function () {
	"use strict";

	function hideLoader(e) {
		var postsList = document.querySelector('.win-surface');
		if (postsList && !WinJS.Utilities.hasClass(postsList, 'hide') && WPCom.dataSources.freshlypressed.groupedList.length)
			WPCom.toggleLoader('hide');
	}

	function getOlderFP(e) {
		if (document.getElementById('freshlypressed-list')) {
			var listview = document.getElementById('freshlypressed-list').winControl;
			if ('itemsLoaded' == listview.loadingState && (listview.indexOfLastVisible + 1 + (2 * WPCom.getDefaultPostCount())) >= WPCom.dataSources.freshlypressed.groupedList.length && !WPCom.dataSources.freshlypressed.fetching)
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
   			if (pos > 0)
   				listview.scrollPosition = pos;
   			listview.removeEventListener('loadingstatechanged', scrollToPosition);
    	}
    }

    WinJS.UI.Pages.define("/html/freshly-pressed.html", {
        ready: function (element, options) {
            WinJS.UI.Animation.enterPage(document.querySelector('header'), { top: '0px', left: '200px' });

            WPCom.populateTabs();
            WPCom.newDataSource('freshlypressed');

            this.updateLayout(element, Windows.UI.ViewManagement.ApplicationView.value);

            document.getElementById('freshlypressed-list').winControl.addEventListener('loadingstatechanged', hideLoader);
        },

        // This function updates the page layout in response to viewState changes.
        updateLayout: function (element, viewState) {
        	if (viewState === Windows.UI.ViewManagement.ApplicationViewState.snapped)
        		WPCom.dataSources.freshlypressed.reset(true, true);

        	var listView = element.querySelector('#freshlypressed-list').winControl;
            var zoomoutView = element.querySelector('#freshlypressed-zoomout-list').winControl;
            var listViewLayout, zoomoutViewLayout;

            if (viewState === Windows.UI.ViewManagement.ApplicationViewState.snapped) {
                listViewLayout = new WinJS.UI.ListLayout();
                zoomoutViewLayout = new WinJS.UI.ListLayout();
			} else {
                listViewLayout = new WinJS.UI.GridLayout();
                zoomoutViewLayout = new WinJS.UI.GridLayout({ maxRows: 1 });
            }

            WinJS.UI.setOptions(listView, {
                itemDataSource: WPCom.dataSources.freshlypressed.groupedList.dataSource,
                itemTemplate: element.querySelector('#freshlypressedTemplate'),
                groupDataSource: WPCom.dataSources.freshlypressed.groupedList.groups.dataSource,
                groupHeaderTemplate: element.querySelector('#headerTemplate'),
                selectionMode: 'none',
                swipeBehavior: 'none',
                oniteminvoked: WPCom.showPost,
				layout: listViewLayout
			});
            WinJS.UI.setOptions(zoomoutView, {
                itemDataSource: WPCom.dataSources.freshlypressed.groupedList.groups.dataSource,
                itemTemplate: element.querySelector('#freshlypressedZoomoutTemplate'),
                selectionMode: 'none',
                swipeBehavior: 'none',
                tapBehavior: 'invoke',
                layout: zoomoutViewLayout
			});

            if (WPCom.dataSources.freshlypressed.scrollPosition > 0) {
            	WPCom.toggleElement(document.querySelector('.win-surface'), 'hide');
            	listView.addEventListener('loadingstatechanged', scrollToPosition);
            }
           	listView.addEventListener('loadingstatechanged', getOlderFP);
        }
	});
})();
