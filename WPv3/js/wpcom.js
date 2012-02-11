var WPCom = {
    localStorageSchemaVersion: '20120209-3',

    dataSources: [],

    apiURL: 'https://public-api.wordpress.com/rest/v1',

    userAgent: function () {
        return "wp-windows8";
    },

	newDataSource: function (filter) {
		if (filter && undefined == WPCom.dataSources[filter]) {

			WPCom.dataSources[filter] = new wpcomDataSource(filter);
			WPCom.dataSources[filter].getData();
		} else {
			WPCom.toggleLoader('hide');
		}
	},

    timeSince: function (date) {
        var seconds = Math.floor((new Date().getTime() / 1000) - (new Date(date).getTime() / 1000));

        var interval = Math.floor(seconds / 31536000);
        var timeago = '';

        if (interval >= 1) {
            timeago = interval + " year";
        } else {
            interval = Math.floor(seconds / 2592000);
            if (interval >= 1) {
                timeago = interval + " month";
            } else {
                interval = Math.floor(seconds / 86400);
                if (interval >= 1) {
                    timeago = interval + " day";
                } else {
                    interval = Math.floor(seconds / 3600);
                    if (interval >= 1) {
                        timeago = interval + " hour";
                    } else {
                        interval = Math.max(1, Math.floor(seconds / 60));
                        timeago = interval + " minute";
                    }
                }
            }
        }

        if (1 != interval)
            timeago = timeago + 's';

        return timeago;
    },

    signInOut: function () {
        if (WPCom.isLoggedIn()) {
            var applicationData = Windows.Storage.ApplicationData.current;
            var localSettings = applicationData.localSettings;
            localSettings.values["wpcomAccessToken"] = null;
            localSettings.values["wpcomBlogID"] = null;
            localSettings.values["wpcomBlogURL"] = null;
            applicationData.signalDataChanged();
            WPCom.resetDataSources();
		}

        var wpcomURL = "https://public-api.wordpress.com/oauth2/authorize?client_id=";
        var clientID = "41";
        var callbackURL = "https://www.wordpress.com";
        wpcomURL += clientID + "&redirect_uri=" + encodeURIComponent(callbackURL) + "&response_type=code";

        try {
            var startURI = new Windows.Foundation.Uri(wpcomURL);
            var endURI = new Windows.Foundation.Uri(callbackURL);
            Windows.Security.Authentication.Web.WebAuthenticationBroker.authenticateAsync(
			Windows.Security.Authentication.Web.WebAuthenticationOptions.default, startURI, endURI).then(WPCom.callbackWebAuth, WPCom.callbackWebAuthError);
        }
        catch (err) {
            //error
            return;
        }
    },

    isLoggedIn: function () {
        var applicationData = Windows.Storage.ApplicationData.current;
        var localSettings = applicationData.localSettings;
        var accessToken = localSettings.values["wpcomAccessToken"];
        if (!accessToken) {
            return false;
        }
        else {
            return true;
        }

    },

    callbackWebAuth: function (result) {
        var responseString = result.responseData;
        if (responseString) {
            //try to parse out the token
            var code = responseString.substring(responseString.indexOf("code=") + 5, responseString.indexOf("&state"));
            if (code.length > 0) {
                //we have the code, let's get the full token
                var data = new FormData();
                data.append('client_id', 41);
                data.append('redirect_uri', 'https://www.wordpress.com');
                data.append('code', code);
                data.append('grant_type', 'authorization_code');

                WinJS.xhr({
                    type: "POST",
                    url: "https://public-api.wordpress.com/oauth2/token",
                    data: data
                }).then(function (result) {
                    var authData = JSON.parse(result.responseText);
                    var authToken = authData.access_token;
                    var blog_id = authData.blog_id;
                    var blog_url = authData.blog_url;
                    var applicationData = Windows.Storage.ApplicationData.current;
                    var localSettings = applicationData.localSettings;
                    localSettings.values["wpcomAccessToken"] = authToken;
                    localSettings.values["wpcomBlogID"] = blog_id;
                    localSettings.values["wpcomBlogURL"] = blog_url;
                    applicationData.signalDataChanged();
                    WPCom.resetDataSources();
                }, function (result) {
                    //handle error
                    window.console.log(result);
                });
            }
        }
    },

    callbackWebAuthError: function (err) {
        //handle error here
    },

    toggleElement: function (e, status) {
        if (null == e)
            return;
        if ('hide' == status || (WinJS.Utilities.hasClass(e, 'show') && 'show' != status)) {
        	if (WinJS.Utilities.hasClass(e, 'show'))
	        	WinJS.Utilities.removeClass(e, 'show');
            WinJS.Utilities.addClass(e, 'hide');
        } else {
        	if (WinJS.Utilities.hasClass(e, 'hide'))
        		WinJS.Utilities.removeClass(e, 'hide');
            WinJS.Utilities.addClass(e, 'show');
        }
    },

    toggleLoader: function (status) {
    	var timeout = 0;
    	if ('hide' == status)
    		timeout = 1000;
    	setTimeout(function () {
    		WPCom.toggleElement(document.getElementById('loader'), status);
    	}, timeout);
    },

    toggleError: function (status) {
        WPCom.toggleElement(document.querySelector('div.error'), status);
    },

    fadeImage: function (img) {
        WinJS.Utilities.addClass(img, 'fadeIn');
    },

    unescapeHTML: function (input) {
        var e = document.createElement('div');
        e.innerHTML = input;
        return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
    },

    showPost: function (eventObject) {
        var eId = eventObject.target.querySelector('.post').id;
        var split = eId.split('-');
        var item = WPCom.dataSources[split[0]].list.getAt(eventObject.detail.itemIndex);

        WinJS.Navigation.navigate("/html/post.html", { item: item });
    },

    populateTabs: function () {
        var ul = document.getElementById('tabs');
        if (null == ul)
            return;
        var tabs = {
            'Freshly Pressed': '/html/freshly-pressed.html',
            //'Blog I Follow': '/html/followed.html',
            //'Posts I Like': '/html/liked.html',
            //'Topics': '/html/topics.html',
        };
        var selected = '';
        for (var tab in tabs) {
            selected = (WinJS.Navigation.location == tabs[tab]) ? 'selected' : '';
            ul.innerHTML += '<li class="' + selected + '"><!--<a href="' + tabs[tab] + '">-->' + tab + '</li>';
        }
        document.querySelector('#tabs li').addEventListener("click", WPCom.tabClick, false);
    },

    tabClick: function (e) {
        e.preventDefault();
        if (null == e.target || null == e.target.href)
            return;
        WinJS.Navigation.navigate(e.target.href);
    },

    refresh: function () {
    	WPCom.toggleError('hide');
    	filter = WPCom.getCurrentFilter();
    	delete localStorage[filter];

    	WPCom.dataSources[filter].reset();
        document.getElementById(filter + "-list").winControl.itemDataSource = WPCom.dataSources[filter].groupedList.dataSource;
        document.getElementById(filter + "-list").winControl.groupDataSource = WPCom.dataSources[filter].groupedList.groups.dataSource;
        document.getElementById(filter + "-zoomout-list").winControl.itemDataSource = WPCom.dataSources[filter].groupedList.groups.dataSource;
        WPCom.toggleElement(document.querySelector('.win-surface'), 'hide');
        WPCom.toggleLoader('show');
        setTimeout(function () {
        	document.getElementById(filter + "-list").winControl.scrollPosition = 0;
        	WPCom.toggleElement(document.querySelector('.win-surface'), 'show');
        	WPCom.toggleLoader('hide');
        }, 1500);
    },

    getDefaultPostCount: function () {
        // all values dividable by 2, 3 or 4 for nicer rows layout
        var w = window.innerWidth;
        if (w > 1980)
            return 36;
        else if (w > 1024)
            return 24;
        else
            return 12;
    },

    displayToastMessage: function (message) {
        //http://code.msdn.microsoft.com/windowsapps/Basic-Toasts-Sample-18f46c14
        var notifications = Windows.UI.Notifications; 
        // Get the toast manager.
        var notificationManager = notifications.ToastNotificationManager;
        
        var toastXml = notificationManager.getTemplateContent(notifications.ToastTemplateType.toastText01);
  
        var textNodes = toastXml.getElementsByTagName("text");
        textNodes.forEach(function (value, index) {
            value.appendChild(toastXml.createTextNode(message));
        });
        
        // Create a toast from the XML
        var toast = new notifications.ToastNotification(toastXml);

        notificationManager.createToastNotifier().show(toast); 
    },

    // if localStorage schema drastically changes from one version to the other, we can reset it easily
    // to comply on app launch by updating WPCom..localStorageSchemaVersion in new releases when needed
    checkLocalStorageSchemaVersion: function () {
    	if (null == localStorage || null == localStorage.schemaVersion || localStorage.schemaVersion != this.localStorageSchemaVersion)
    		WPCom.clearLocalStorage();
    },

    clearLocalStorage: function () {
    	localStorage.clear();
    	localStorage.schemaVersion = this.localStorageSchemaVersion;
    	localStorage.tokenHash = WPCom.getCurrentAccessToken();
    	WPCom.setCurrentUser();
    },

    resetDataSources: function () {
    	for (var filter in WPCom.dataSources) {
    		// No need to reset freshlypressed because none of the data is specific to a user
    		if ('freshlypressed' == filter)
    			continue;

    		WPCom.dataSources[filter].reset(true);
		}

    	if (!WPCom.isLoggedIn() && 'freshlypressed' != WPCom.getCurrentFilter())
	    	WinJS.Navigation.navigate("/html/freshly-pressed.html");
    },

    getCurrentAccessToken: function () {
        if (!WPCom.isLoggedIn())
            return;
        return Windows.Storage.ApplicationData.current.localSettings.values["wpcomAccessToken"];
    },

    getCurrentBlogID: function () {
        if (!WPCom.isLoggedIn())
            return;
        return Windows.Storage.ApplicationData.current.localSettings.values["wpcomBlogID"];
    },

    getCurrentBlogURL: function () {
        if (!WPCom.isLoggedIn())
            return;
        return Windows.Storage.ApplicationData.current.localSettings.values["wpcomBlogURL"];
    },

    setCurrentUser: function () {
        if (!WPCom.isLoggedIn()) {
            localStorage.currentUser = null;
        } else {
            WinJS.xhr({
                type: "GET",
                url: WPCom.apiURL + '/me',
                headers: { "Authorization": "Bearer " + WPCom.getCurrentAccessToken() }
            }).then(function (result) {
                localStorage.currentUser = result.responseText;
            }, function (result) {
                localStorage.currentUser = null;
                console.log('Failed to ajax-get user info.');
            });
        }
    },

    getCurrentFilter: function () {
        var filter = null;
        var filterEl = document.querySelector('.fragment.reader-filter');
        if (null != filterEl) {
            // list view
            filter = filterEl.className;
            if (null != filter) {
                filter = filter.replace('fragment', '');
                filter = filter.replace('reader-filter', '');
                filter = filter.replace(/^\s+|\s+$/g, "");
            }
        } else {
            filterEl = document.querySelector('.post');
            if (null != filterEl && WinJS.Utilities.hasClass(filterEl, 'fragment')) {
                // single post view
                var post_key = filterEl.getAttribute('id');
                if (null != post_key) {
                    filter = post_key.split('-')[0];
                }
            }
        }
    	return filter;
    },

    getLSPost: function (local_storage_key) {
        var split = local_storage_key.split('-');
        if (2 !== split.length)
            return; // won't be able to define the filter and actual post key
        var filter = split[0];
        var post_key = split[1];
        if (null == filter || null == post_key)
            return; // can't figure out the filter or post_key
        filterData = JSON.parse(localStorage[filter]);
        if (null == filterData)
            return; // couldn't find any data
        post = filterData['posts'][post_key];
        if (null == post || null == post.ID)
            return; // couldn't find the post
        return post;
    }
}

function wpcomDataSource(filter) {
	this.filter = filter;
	this.newest_in_date_range = null;
	this.oldest_in_date_range = null;
	this.list = new WinJS.Binding.List();
	this.groupedList = this.list.createGrouped(this.getGroupKey, this.getGroupData, this.compareGroups);
	this.fetching = false;
	this.scrollPosition = 0;
}

// olderOrNewer: 'older', 'newer', or empty
wpcomDataSource.prototype.getData = function (olderOrNewer) {
	if (this.fetching)
		return;
	else
	    this.fetching = true;

	var self = this;
	var url = WPCom.apiURL;
	var query_string = '?content_width=480&number=' + WPCom.getDefaultPostCount();

	switch (this.filter) {
        /*
	    case 'following':
	        // build endpoint-specific path and query string, see defaults
	        break;
	    */
        default:
	        url += '/freshly-pressed/';
	        query_string += '&thumb_width=252&thumb_height=148';
    }

    if (null != localStorage[this.filter]) {
		var localStorageObject = JSON.parse(localStorage[this.filter]);

		// If we aren't getting older always attempt to get newer posts than we already have as an auto refresh, since we already have posts in localStorage
		// We only want to grab older or newer since we already have posts in localStorage, otherwise we should always grab current posts
		if ('older' != olderOrNewer || 'newer' == olderOrNewer) {
			olderOrNewer = 'newer';
			query_string += '&after=' + escape(new Date(localStorageObject.date_range.newest).toUTCString());
		} else if ('older' == olderOrNewer) {
		    query_string += '&before=' + escape(new Date(localStorageObject.date_range.oldest).toUTCString());
        }

		// initialize from localStorage since the listview is empty
		if (0 == this.groupedList.length) {
			this.cleanupLocalStorage();
			localStorageObject = JSON.parse(localStorage[this.filter]);

			this.addItemsToList(localStorageObject.posts, 'end');
			this.setDateRange(localStorageObject.date_range);

			WPCom.toggleLoader('hide');
		}
    }

    var full_url = url + query_string;

    var headers = { "User-Agent": WPCom.userAgent() };
    if (WPCom.isLoggedIn())
        headers['Authorization'] = 'Bearer ' + WPCom.getCurrentAccessToken();

    WinJS.xhr({ type: 'GET', url: full_url, headers: headers }).then(function (r) {
		var data = JSON.parse(r.responseText);
		var posts = {};
		var date_range = {};
		var post_count = 0;

		if (data.number > 0) {
		    var updated = false;

		    var keyed_posts = {};
		    var post_key = null;

		    for (var p = 0; p < data.posts.length; p++) {
		        if (data.posts[p].editorial.blog_id) {
		            post_key = data.posts[p].editorial.blog_id + '_' + data.posts[p].ID;
		        }  else {
		            post_key = data.posts[p].ID;
		        }
		        keyed_posts[post_key] = data.posts[p];
		    }

			if (0 == self.groupedList.length) {
			    posts = keyed_posts;
			    self.addItemsToList(keyed_posts, 'end');
				date_range.oldest = data.date_range.oldest;
				date_range.newest = data.date_range.newest;
				post_count = data.number;
				updated = true;
				WPCom.toggleLoader('hide');
			} else if ('older' == olderOrNewer) {
				posts = localStorageObject.posts;
				self.addItemsToList(keyed_posts, 'end');
				for (var attrname in keyed_posts) {
				    posts[attrname] = keyed_posts[attrname];
				}
				date_range.oldest = data.date_range.oldest;
				date_range.newest = localStorageObject.date_range.newest;
				post_count = localStorageObject.post_count + data.number;
				updated = true;
			} else if ('newer' == olderOrNewer) {
			    posts = keyed_posts;
			    self.addItemsToList(keyed_posts, 'start');
				for (var attrname in localStorageObject.posts) {
					posts[attrname] = localStorageObject.posts[attrname];
				}
				date_range.oldest = localStorageObject.date_range.oldest;
				date_range.newest = data.date_range.newest;
				post_count = localStorageObject.post_count + data.number;
				updated = true;
            }

			if (updated) {
				localStorage[self.filter] = JSON.stringify({ 'post_count': post_count, 'date_range': date_range, 'posts': posts });
				self.setDateRange(date_range);
			}
		}

		self.fetching = false;
		if (self.groupedList.length < WPCom.getDefaultPostCount())
			self.getData('older');
	},
        function (r) {
            self.fetching = false;
            var errorDiv =  document.querySelector('div.error');
            if (null != errorDiv && 0 == self.groupedList.length) {
                // if we have an error div in this template, and if we had no offline content
                errorDiv.innerHTML = '<p><strong>Sorry, but we could not connect to WordPress.com.</strong></p><p>Please try again later.</p>';
                WPCom.toggleError('show');
            }
            WPCom.toggleLoader('hide');
        }
	);
}

// startOrEnd: 'start', 'end'
wpcomDataSource.prototype.addItemsToList = function (jsonPosts, startOrEnd) {
	var arrayItems = [];
	for (var key in jsonPosts) {
	    arrayItems.push({
	        post_title: (jsonPosts[key].editorial.custom_headline.length) ? WPCom.unescapeHTML(jsonPosts[key].editorial.custom_headline) : WPCom.unescapeHTML(jsonPosts[key].title),
			blog_name: WPCom.unescapeHTML(jsonPosts[key].editorial.blog_name),
			post_image: jsonPosts[key].editorial.image.replace(/https:\/\/([^\.]+).wordpress.com/, 'http://s.wordpress.com'),
			post_id: jsonPosts[key].ID,
			blog_id: jsonPosts[key].editorial.blog_id,
			site_id: jsonPosts[key].editorial.site_id,
			ts: jsonPosts[key].editorial.picked_on,
            permalink: jsonPosts[key].URL,
            post_date: jsonPosts[key].date,
			post_author: jsonPosts[key].author.ID,
			author_name: jsonPosts[key].author.name,
			author_gravatar: jsonPosts[key].author.avatar_URL.replace(/s=\d+/, 's=40'),
			local_storage_key: (this.filter + '-' + key)
        });
	}

	if ('start' == startOrEnd)
		arrayItems.reverse();

	var groupItemIndex, groupItem, date, matches;
	for (var i = 0; i < arrayItems.length; i++) {
		if ('start' == startOrEnd)
			this.list.unshift(arrayItems[i]);
		else // 'end'
			this.list.push(arrayItems[i]);

		// check to see if we need to update the group item
		date = new Date(arrayItems[i].ts);
		groupItemIndex = WPCom.dataSources['freshlypressed'].groupedList.groups.indexOfKey(new Date(date.getFullYear(), date.getMonth(), date.getDate()).toString());
		if ( groupItemIndex >= 0 ) {
			groupItem = WPCom.dataSources['freshlypressed'].groupedList.groups.getAt(groupItemIndex);
			var image = arrayItems[i].post_image.replace(/resize=\d+\,\d+/, 'resize=56px,56px');
			image = image.replace(/crop=\d+px\,\d+px\,\d+px\,\d+px/, 'resize=56px,56px');
			matches = groupItem.thumbnails.match(/\<img/g)
			if (matches.length > 0 && matches.length < 3 && -1 == groupItem.thumbnails.indexOf(image))
				groupItem.thumbnails += '<img width="56px" height="56px" src="' + image + '" />';
		}
	}
}

wpcomDataSource.prototype.setDateRange = function (date_range) {
    this.oldest_in_date_range = date_range.oldest;
	this.newest_in_date_range = date_range.newest;
}

wpcomDataSource.prototype.reset = function (skipData) {
	this.newest_in_date_range = null;
	this.oldest_in_date_range = null;
	this.list = new WinJS.Binding.List();
	this.groupedList = this.list.createGrouped(this.getGroupKey, this.getGroupData, this.compareGroups);
	this.fetching = false;
	this.scrollPosition = 0;
	if (true != skipData)
		this.getData();
}

wpcomDataSource.prototype.cleanupLocalStorage = function () {
	var localStorageObject = JSON.parse(localStorage[this.filter]);
	var cleanupCount = 2 * WPCom.getDefaultPostCount();

	if (localStorageObject.post_count > cleanupCount) {
	    var i = 0, posts = {}, oldest_in_date_range = null, newest_in_date_range = null;

		for (var key in localStorageObject.posts) {
			i++;
			posts[key] = localStorageObject.posts[key];

			if (null == oldest_in_date_range || new Date(posts[key].editorial.picked_on) < new Date(oldest_in_date_range))
			    oldest_in_date_range = posts[key].editorial.picked_on;
			if (null == newest_in_date_range || new Date(posts[key].editorial.picked_on) > new Date(newest_in_date_range))
			    newest_in_date_range = posts[key].editorial.picked_on;

			if (i >= cleanupCount)
				break;
		}

		localStorageObject = { 'date_range': { 'oldest': oldest_in_date_range, 'newest': newest_in_date_range }, 'post_count': i, 'posts': posts };
		localStorage[this.filter] = JSON.stringify(localStorageObject);
	}
}

wpcomDataSource.prototype.compareGroups = function (a, b) {
	var aDate = new Date(a), bDate = new Date(b);
	if (aDate == bDate)
		return 0;
	else if (aDate < bDate)
		return 1;
	else
		return -1;
}

wpcomDataSource.prototype.getGroupKey = function (dataItem) {
	var date = new Date(dataItem.ts);

	return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toString();
}

wpcomDataSource.prototype.getGroupData = function (dataItem) {
	var days = new Array('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');
	var months = new Array('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December');
	var date = new Date(dataItem.ts);
	var groupKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toString();
	var filter = WPCom.getCurrentFilter();
	var thumbnails = '';
	if (filter) {
		var index = WPCom.dataSources[filter].list.indexOf(dataItem);
		var i = index;
		while (i < (index + 3) && i < WPCom.dataSources[filter].list.length) {
			var item = WPCom.dataSources[filter].list.getAt(i);
			var itemDate = new Date(item.ts);
			var itemGroupKey = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate()).toString();

			if (itemGroupKey.toString() != groupKey)
				break;

			var image = item.post_image.replace(/resize=\d+\,\d+/, 'resize=56px,56px');
			image = image.replace(/crop=\d+px\,\d+px\,\d+px\,\d+px/, 'resize=56px,56px')
			thumbnails += '<img width="56px" height="56px" src="' + image + '" />';
			i++;
		}
	}

	return {
		thumbnails: thumbnails,
		day_of_month: date.getDate(),
		day_name: days[date.getDay()],
		month_name: months[date.getMonth()],
		month_short: months[date.getMonth()].substr(0, 3),
		group_title: months[date.getMonth()] + ' ' + date.getDate()
	}
}