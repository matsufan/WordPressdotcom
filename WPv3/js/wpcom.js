var WPCom = {
    localStorageSchemaVersion: '20120131-2',

    dataSources: [],

    userAgent: function () {
        return "wp-windows8";
    },

	newDataSource: function (filter) {
		if (filter && undefined == WPCom.dataSources[filter]) {

			WPCom.dataSources[filter] = new wpcomDataSource(filter);
			WPCom.dataSources[filter].init();
		} else {
			WPCom.toggleLoader('hide');
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
            localSettings.values["wpcomAccessToken"] = null;
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
            catch (err) {
                //error
                return;
            }
        }

        WPCom.updateSignInOutButton();
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
                    var applicationData = Windows.Storage.ApplicationData.current;
                    var localSettings = applicationData.localSettings;
                    localSettings.values["wpcomAccessToken"] = authToken;
                    applicationData.signalDataChanged();
                    WPCom.updateSignInOutButton();
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

    refresh: function () {
		// throw it all away for now. Make it smarter when we have more than one dataSource
        localStorage.clear();
        for (var filter in WPCom.dataSources) {
        	WPCom.dataSources[filter].reset();
        	document.getElementById(filter + "-list").winControl.itemDataSource = WPCom.dataSources[filter].dataSource;
        	WPCom.toggleElement(document.querySelector('.win-surface'), 'hide');
        	WPCom.toggleLoader('show');
        	setTimeout(function () {
        		WPCom.toggleElement(document.querySelector('.win-surface'), 'show');
        		WPCom.toggleLoader('hide');
        	}, 1500);
    	}
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
        if (null == localStorage || null == localStorage.schemaVersion || localStorage.schemaVersion != this.localStorageSchemaVersion) {
            localStorage.clear();
            localStorage.schemaVersion = this.localStorageSchemaVersion;
        }
    },
}

function wpcomDataSource(filter) {
	this.filter = filter;
	this.newest_ts = null;
	this.oldest_ts = null;
	this.list = new WinJS.Binding.List();
	this.dataSource;
	this.fetching = false;
	this.scrollPosition = false;
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
	var ajaxurl = 'https://wordpress.com/wp-admin/admin-ajax.php';
	ajaxurl += '?action=' + 'get_' + escape(this.filter) + '_json';
	ajaxurl += '&count=' + WPCom.getDefaultPostCount();
    ajaxurl += '&img_width=252&img_height=160'

    if (null != localStorage[this.filter]) {
		var localStorageObject = JSON.parse(localStorage[this.filter]);

		// If we aren't getting older always attempt to get newer posts than we already have as an auto refresh, since we already have posts in localStorage
		// We only want to grab older or newer since we already have posts in localStorage, otherwise we should always grab current posts
		if ('older' != olderOrNewer || 'newer' == olderOrNewer) {
			olderOrNewer = 'newer';
			ajaxurl = ajaxurl + '&after=' + escape(localStorageObject.meta.newest_ts);
		} else if ('older' == olderOrNewer) {
			ajaxurl = ajaxurl + '&before=' + escape(localStorageObject.meta.oldest_ts);
		}

		// initialize from localStorage since the listview is empty
		if (0 == this.list.length) {
			this.cleanupLocalStorage();
			localStorageObject = JSON.parse(localStorage[this.filter]);

			this.addItemsToList(localStorageObject.posts, 'end');
			this.setMeta(localStorageObject.meta);

			WPCom.toggleLoader('hide');
		}
	}

	WinJS.xhr({ url: ajaxurl }).then(function (r) {
		var data = JSON.parse(r.responseText);
		var posts = {};
		var meta = {};

		if (data.meta.post_count > 0) {
			var updated = false;

			if (0 == self.list.length) {
				posts = data.posts;
				self.addItemsToList(data.posts, 'end');
				meta.oldest_ts = data.meta.oldest_ts;
				meta.newest_ts = data.meta.newest_ts;
				meta.post_count = data.meta.post_count;
				updated = true;
				WPCom.toggleLoader('hide');
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
				self.setMeta(meta);
			}
		}

		self.fetching = false;
		if (self.list.length < WPCom.getDefaultPostCount())
			self.getData('older');
	},
        function (r) {
            self.fetching = false;
            var errorDiv =  document.querySelector('div.error');
            if (null != errorDiv && 0 == self.list.length) {
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
			post_title: WPCom.unescapeHTML(jsonPosts[key].post_title),
			blog_name: WPCom.unescapeHTML(jsonPosts[key].blog_name),
			post_image: jsonPosts[key].post_image.replace('https://s-ssl.wordpress.com', 'http://s.wordpress.com'),
			post_image_css: "url('" + jsonPosts[key].post_image + "')",
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

wpcomDataSource.prototype.setMeta = function (meta) {
	this.oldest_ts = meta.oldest_ts;
	this.newest_ts = meta.newest_ts;
}

wpcomDataSource.prototype.reset = function () {
	this.newest_ts = null;
	this.oldest_ts = null;
	this.list = new WinJS.Binding.List();
	this.dataSource;
	this.fetching = false;
	this.scrollPosition = false;
	this.getData();
}

wpcomDataSource.prototype.cleanupLocalStorage = function () {
	var localStorageObject = JSON.parse(localStorage[this.filter]);
	var cleanupCount = 2 * WPCom.getDefaultPostCount();

	if (localStorageObject.meta.post_count > cleanupCount) {
		var i = 0, posts = {}, oldest_ts = null, newest_ts = null;

		for (var key in localStorageObject.posts) {
			i++;
			posts[key] = localStorageObject.posts[key];

			if (null == oldest_ts || posts[key].ts < oldest_ts)
				oldest_ts = posts[key].ts;
			if (null == newest_ts || posts[key].ts > newest_ts)
				newest_ts = posts[key].ts;

			if (i >= cleanupCount)
				break;
		}

		localStorageObject = { 'meta': { 'oldest_ts': oldest_ts, 'newest_ts': newest_ts, 'post_count': i }, 'posts': posts };
		localStorage[this.filter] = JSON.stringify(localStorageObject);
	}
}