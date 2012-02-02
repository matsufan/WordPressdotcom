(function () {
    "use strict";

    var item;

    function ready(element, options) {
    	WinJS.UI.Animation.enterPage(document.querySelector('.fragment.post'), { top: '0px', left: '200px' });

    	item = options.item;

    	document.title = item.post_title;

        document.querySelector('.title').innerText = item.post_title;

        setInnerHTMLUnsafe(document.querySelector('.content'), item.post_content);

        document.querySelector('.meta').innerHTML += '<img src="' + item.author_gravatar + '" height="40" width="40" />';
        document.querySelector('.meta').innerHTML += '<div class="meta-txt"><em>by ' + item.author_name + '</em><br />Posted ' + WPCom.timeSince(item.ts) + ' ago on ' + item.blog_name + '</div>';

        if (WPCom.isLoggedIn())
            updateButtons();

        document.querySelector("div.postActions").addEventListener("click", socialPostClick, false);
        document.getElementById('openinbrowser').addEventListener("click", function () { top.location.href = item.permalink; }, false);

        return; // convenient to set breakpoint :)
    }

    function updateLayout(element, viewState) {
        // TODO: Respond to changes in viewState.
    }

    function updateButtons() {
        var applicationData = Windows.Storage.ApplicationData.current;
        var localSettings = applicationData.localSettings;
        var accessToken = localSettings.values["wpcomAccessToken"];

        var likeButton = document.getElementsByClassName('like').item(0);
        var likeUrl = "https://public-api.wordpress.com/rest/v1/sites/" + item.blog_id + "/posts/" + item.post_id + "/likes/mine/";
        WinJS.xhr({
            type: "GET",
            url: likeUrl,
            headers: { "Authorization": "Bearer " + accessToken, "User-Agent": WPCom.userAgent() }
        }).then(function (result) {
            var likeData = JSON.parse(result.responseText);
            if (likeData.i_like == true)
                likeButton.innerText = "Unlike";
            else
                likeButton.innerText = "Like";
        }, function (result) {
            //error
            window.console.log(result);
        });

        var followButton = document.getElementsByClassName('follow').item(0);
        var followUrl = "https://public-api.wordpress.com/rest/v1/sites/" + item.blog_id + "/follows/mine/";
        WinJS.xhr({
            type: "GET",
            url: followUrl,
            headers: { "Authorization": "Bearer " + accessToken, "User-Agent": WPCom.userAgent() }
        }).then(function (result) {
            var followData = JSON.parse(result.responseText);
            if (followData.is_following == true)
                followButton.innerText = "Unfollow";
            else
                followButton.innerText = "Follow";
        }, function (result) {
            //error
            window.console.log(result);
        });

        var reblogButton = document.getElementsByClassName('reblog').item(0);
        var reblogUrl = "https://public-api.wordpress.com/rest/v1/sites/" + item.blog_id + "/posts/" + item.post_id + "/reblogs/mine/";
        WinJS.xhr({
            type: "GET",
            url: reblogUrl,
            headers: { "Authorization": "Bearer " + accessToken, "User-Agent": WPCom.userAgent() }
        }).then(function (result) {
            var reblogData = JSON.parse(result.responseText);
            if (reblogData.is_reblogged == true)
                reblogButton.innerText = "Reblogged";
            else
                reblogButton.innerText = "Reblog";
        }, function (result) {
            //error
            window.console.log(result);
        });

    }

    function socialPostClick(m) {
        var applicationData = Windows.Storage.ApplicationData.current;
        var localSettings = applicationData.localSettings;
        var accessToken = localSettings.values["wpcomAccessToken"];

        var socialType = m.target.className;
        var url = "";

        if (WPCom.isLoggedIn()) {
            switch (socialType) {
                case 'like':
                    var curText = m.target.innerText;
                    if (curText == "Like") {
                        m.target.innerText = "Liking...";
                        url = "https://public-api.wordpress.com/rest/v1/sites/" + item.blog_id + "/posts/" + item.post_id + "/likes/new";
                    } else {
                        m.target.innerText = "Unliking...";
                        url = "https://public-api.wordpress.com/rest/v1/sites/" + item.blog_id + "/posts/" + item.post_id + "/likes/mine/delete";
                    }

                    WinJS.xhr({
                        type: "POST",
                        url: url,
                        headers: { "Authorization": "Bearer " + accessToken }
                    }).then(function (result) {
                        var likeData = JSON.parse(result.responseText);
                        if (likeData.i_like == true)
                            m.target.innerText = "Unlike";
                        else
                            m.target.innerText = "Like";
                    }, function (result) {
                        //error, reset the button
                        m.target.innerText = curText;
                        WPCom.displayToastMessage("Sorry, a network error occurred. Please try again later.");
                    });

                    break;
                case 'reblog':
                    var reblogUI = document.getElementsByClassName('reblogUI').item(0);
                    if (m.target.innerText != "Reblogged") {
                        if (reblogUI.style.display == "none" || reblogUI.style.display == "") {
                            reblogUI.style.display = "block";
                            WinJS.UI.Animation.fadeIn(reblogUI);
                        } else {
                            WinJS.UI.Animation.fadeOut(reblogUI);
                            reblogUI.style.display = "none";
                        }
                    } else {
                        WPCom.displayToastMessage("You have already reblogged this post.");
                    }

                    break;
                case 'publish-reblog':
                    m.target.innerText = "Reblogging...";
                    url = "https://public-api.wordpress.com/rest/v1/sites/" + item.blog_id + "/posts/" + item.post_id + "/reblogs/new";
                    var reblogButton = document.getElementsByClassName('reblog').item(0);
                    var data = new FormData();
                    var note = document.getElementById("note").innerText;
                    if (note != "" && note != "Your comments (optional)") {
                        data.append('note', note);
                    }
                    WinJS.xhr({
                        type: "POST",
                        url: url,
                        headers: { "Authorization": "Bearer " + accessToken },
                        data: data
                    }).then(function (result) {
                        var reblogData = JSON.parse(result.responseText);
                        if (reblogData.is_reblogged == true) {
                            //mission accomplished
                            reblogButton.innerText = "Reblogged";
                            var reblogUI = document.getElementsByClassName('reblogUI').item(0);
                            WinJS.UI.Animation.fadeOut(reblogUI);
                            reblogUI.style.display = "none";
                        }
                        else {
                            reblogButton.innerText = "Reblog";
                            WPCom.displayToastMessage("Sorry, a network error occurred. Please try again later.");
                        }
                    }, function (result) {
                        //error, reset the button
                        reblogButton.innerText = "Reblog";
                        WPCom.displayToastMessage("Sorry, a network error occurred. Please try again later.");
                    });

                    break;
                case 'follow':
                    var curText = m.target.innerText;
                    if (curText == "Follow") {
                        m.target.innerText = "Following...";
                        url = "https://public-api.wordpress.com/rest/v1/sites/" + item.blog_id + "/follows/new";
                    } else {
                        m.target.innerText = "Unfollowing...";
                        url = "https://public-api.wordpress.com/rest/v1/sites/" + item.blog_id + "/follows/mine/delete";
                    }

                    WinJS.xhr({
                        type: "POST",
                        url: url,
                        headers: { "Authorization": "Bearer " + accessToken }
                    }).then(function (result) {
                        var followData = JSON.parse(result.responseText);
                        if (followData.is_following == true)
                            m.target.innerText = "Unfollow";
                        else
                            m.target.innerText = "Follow";
                    }, function (result) {
                        //error, reset the button
                        m.target.innerText = curText;
                        WPCom.displayToastMessage("Sorry, a network error occurred. Please try again later.");
                    });

                    break;
                case 'note-text':
                    if (m.target.innerText == "Your comments (optional)")
                        m.target.innerText = "";
            };
        }
        else {
            WPCom.signInOut();
        }
    }

    WinJS.UI.Pages.define("/html/post.html", {
        ready: ready,
        updateLayout: updateLayout
	});
})();
