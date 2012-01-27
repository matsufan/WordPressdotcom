var WPCom = {
	dataSources: [],

	newDataSource: function (filter) {
		if (filter) {
			this.dataSources[filter] = new wpcomDataSource(filter);
			this.dataSources[filter].init();
		}
	},

    timeSince: function (date) {
        var seconds = Math.floor((new Date().getTime() / 1000) - date);

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
            // logout
            var applicationData = Windows.Storage.ApplicationData.current;
            var localSettings = applicationData.localSettings;
            localSettings.values["wpcomAccessKey"] = null;
            applicationData.signalDataChanged();
        } else {
            // login
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
            catch (err) {	/*Error launching WebAuth"*/	return; }
        }

        WPCom.updateSignInOutButton();
    },

    isLoggedIn: function () {
        var applicationData = Windows.Storage.ApplicationData.current;
        var localSettings = applicationData.localSettings;
        var value = localSettings.values["wpcomAccessKey"];
        if (!value) {
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
            var token = responseString.substring(responseString.indexOf("code=") + 5, responseString.indexOf("&state"));
            if (token.length > 0) {
                var applicationData = Windows.Storage.ApplicationData.current;
                var localSettings = applicationData.localSettings;
                localSettings.values["wpcomAccessKey"] = token;
                applicationData.signalDataChanged();
                WPCom.updateSignInOutButton();
            }
        }
    },

    callbackWebAuthError: function (err) {
        //handle error here
    },

    updateSignInOutButton: function () {
        var signinout = document.getElementById('signinout');

        if (WPCom.isLoggedIn()) {
            WinJS.Utilities.removeClass(signinout, 'signin');
            WinJS.Utilities.addClass(signinout, 'signout');
            document.querySelector('#signinout .win-label').textContent = 'Sign Out';
        } else {
            WinJS.Utilities.removeClass(signinout, 'signout');
            WinJS.Utilities.addClass(signinout, 'signin');
            document.querySelector('#signinout .win-label').textContent = 'Sign In';
        }
    },

    toggleLoader: function (status) {
        var loader = document.getElementById('loader');
        if ('hide' == status || (WinJS.Utilities.hasClass(loader, 'show') && 'show' != status)) {
            WinJS.Utilities.removeClass(loader, 'show');
            WinJS.Utilities.addClass(loader, 'hide');
        } else {
            WinJS.Utilities.removeClass(loader, 'hide');
            WinJS.Utilities.addClass(loader, 'show');
        }
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
    	//var item = data.items.getAt(eventObject.detail.itemIndex);
        var store, key;
        var eId = eventObject.target.querySelector('.post').id;
        var split = eId.split('-');

        WinJS.Navigation.navigate("/html/post.html", { filter: split[0], key: split[1] });
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
            ul.innerHTML += '<li class="' + selected + '"><a href="' + tabs[tab] + '">' + tab + '</li>';
        }
        document.querySelector('#tabs li').addEventListener("click", WPCom.tabClick, false);
    },

    tabClick: function (e) {
        e.preventDefault();
        if (null == e.target || null == e.target.href)
            return;
        WinJS.Navigation.navigate(e.target.href);
    },
}

function wpcomDataSource(filter) {
	this.filter = filter;
	this.newest_ts = null;
	this.oldest_ts = null;
	this.post_count = 0;
	this.list = new WinJS.Binding.List();
	this.dataSource;
	this.fetching = false;
}

wpcomDataSource.prototype.init = function () {
	this.getData();

	this.dataSource = this.list.dataSource;
}

// olderOrNewer: 'older', 'newer', or empty
wpcomDataSource.prototype.getData = function (olderOrNewer) {
	if (this.fetching)
		return;
	else
		this.fetching = true;

	var self = this;
	var ajaxurl = 'https://wordpress.com/wp-admin/admin-ajax.php?action=' + 'get_' + escape(this.filter) + '_json';

	if (null != localStorage[this.filter]) {
		var localStorageObject = JSON.parse(localStorage[this.filter]);

		// If we aren't getting older always attempt to get newer posts than we already have as an auto refresh, since we already have posts in localStorage
		// We only want older or newer since we already have posts in localStorage, otherwise we should always grab current posts
		if ('older' != olderOrNewer || 'newer' == olderOrNewer) {
			olderOrNewer = 'newer';
			ajaxurl = ajaxurl + '&after=' + escape(localStorageObject.meta.newest_ts);
		} else if ('older' == olderOrNewer) {
			ajaxurl = ajaxurl + '&before=' + escape(localStorageObject.meta.oldest_ts);
		}

		// initialize from localStorage since it's a first load
		if (0 == this.list.length) {
			this.addItemsToList(localStorageObject.posts, 'end');
			WPCom.toggleLoader('hide');
		}
	}

	WinJS.xhr({ url: ajaxurl }).then(function (r) {
		var data = JSON.parse(r.responseText);
		var posts;
		var meta = {};

		if (data.meta.post_count > 0) {
			var updated = false;
			WPCom.toggleLoader('hide');

			if (0 == self.list.length) {
				posts = data.posts;
				self.addItemsToList(data.posts, 'end');
				meta.oldest_ts = data.meta.oldest_ts;
				meta.newest_ts = data.meta.newest_ts;
				meta.post_count = data.meta.post_count;
				updated = true;
			} else if ('older' == olderOrNewer) {
				posts = localStorageObject.posts;
				self.addItemsToList(data.posts, 'end');
				for (var attrname in data.posts) {
					posts[attrname] = data.posts[attrname];
				}
				meta.oldest_ts = data.meta.oldest_ts;
				meta.newest_ts = localStorageObject.meta.newest_ts;
				meta.post_count = localStorageObject.meta.post_count + data.meta.post_count;
				updated = true;
			} else if ('newer' == olderOrNewer) {
				posts = data.posts;
				self.addItemsToList(data.posts, 'start');
				for (var attrname in localStorageObject.posts) {
					posts[attrname] = localStorageObject.posts[attrname];
				}
				meta.oldest_ts = localStorageObject.meta.oldest_ts;
				meta.newest_ts = data.meta.newest_ts;
				meta.post_count = localStorageObject.meta.post_count + data.meta.post_count;
				updated = true;
			}

			if (updated) {
				localStorage[self.filter] = JSON.stringify({ 'meta': meta, 'posts': posts });
				self.oldest_ts = meta.oldest_ts;
				self.newest_ts = meta.newest_ts;
				self.post_count = meta.post_count;
			}
		}
		self.fetching = false;
	},
        function (r) {
        	self.fetching = false;
        	console.log('fail...');
        }
	);
}

// startOrEnd: 'start', 'end'
wpcomDataSource.prototype.addItemsToList = function (jsonPosts, startOrEnd) {
	var arrayItems = [];
	for (var key in jsonPosts) {
		arrayItems.push({
			post_title: WPCom.unescapeHTML(jsonPosts[key].post_title),
			blog_name: WPCom.unescapeHTML(jsonPosts[key].blog_name),
			post_image: jsonPosts[key].post_image,
			ts: jsonPosts[key].ts,
			post_id: jsonPosts[key].ID,
			post_content: jsonPosts[key].post_content,
			blog_id: jsonPosts[key].blog_id,
			permalink: jsonPosts[key].permalink,
			post_date_gmt: jsonPosts[key].post_date_gmt,
			post_author: jsonPosts[key].post_author,
			is_followed: jsonPosts[key].is_followed,
			is_reblogged: jsonPosts[key].is_reblogged,
			is_liked: jsonPosts[key].is_liked,
			author_name: jsonPosts[key].author_name,
			author_gravatar: jsonPosts[key].author_gravatar,
			local_storage_key: (this.filter + '-' + key),
			site_id: jsonPosts[key].site_id
		});
	}

	if ('start' == startOrEnd)
		arrayItems.reverse();

	for (var i = 0; i < arrayItems.length; i++) {
		if ('start' == startOrEnd)
			this.list.unshift(arrayItems[i]);
		else // 'end'
			this.list.push(arrayItems[i]);
	}
}