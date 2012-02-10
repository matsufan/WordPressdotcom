(function () {
    "use strict";

    var item;

    function ready(element, options) {
    	WinJS.UI.Animation.enterPage(document.querySelector('.fragment.post'), { top: '0px', left: '200px' });

    	item = options.item;

    	document.title = item.post_title;

    	document.querySelector('.post').setAttribute('id', item.local_storage_key);

        document.querySelector('.title').innerText = item.post_title;

        setInnerHTMLUnsafe(document.querySelector('.content'), item.post_content);

        document.querySelector('.meta').innerHTML += '<img src="' + item.author_gravatar + '" height="40" width="40" />';
        document.querySelector('.meta').innerHTML += '<div class="meta-txt"><em>by ' + item.author_name + '</em><br />Posted ' + WPCom.timeSince(item.post_date) + ' ago on ' + item.blog_name + '</div>';

        if (WPCom.isLoggedIn())
            updateButtons();

        //document.querySelector("div.postActions").addEventListener("click", socialPostClick, false);
        document.getElementById("follow").addEventListener("click", socialPostClick, false);
        document.getElementById("like").addEventListener("click", socialPostClick, false);
        document.getElementById("reblog").addEventListener("click", socialPostClick, false);
        document.getElementById("publish-reblog").addEventListener("click", socialPostClick, false);
        document.getElementById('openinbrowser').addEventListener("click", function () { top.location.href = item.permalink; }, false);

        // Catch link clicks and iframe them.
        var links = document.querySelectorAll('.content a');
        for (var i = 0; i < links.length; i++) {
            var href = links[i].getAttribute('href');
            links[i].addEventListener('click', function (e) {
                e.preventDefault();
                var iframe = document.createElement("iframe");
                var backbar = document.createElement("div");

                document.body.appendChild(iframe);
                iframe.setAttribute( 'src', href );
                iframe.setAttribute('id', 'external-link');

                document.body.appendChild(backbar);
                backbar.setAttribute('id', 'backbar');
                var backlink = document.createElement("a");
                backbar.appendChild(backlink);
                backlink.innerHTML = 'Back';

                backlink.addEventListener('click', function (e) {
                    e.preventDefault();
                    iframe.removeNode();
                    backbar.removeNode();
                });
            });
        }

        return; // convenient to set breakpoint :)
    }

    function updateLayout(element, viewState) {
        // TODO: Respond to changes in viewState.
    }

    function updateButtons() {
        var accessToken = WPCom.getCurrentAccessToken();

        var likeButton = document.getElementById('like');
        var likeUrl = WPCom.apiURL + "/sites/" + item.blog_id + "/posts/" + item.post_id + "/likes/mine/";
        WinJS.xhr({
            type: "GET",
            url: likeUrl,
            headers: { "Authorization": "Bearer " + accessToken, "User-Agent": WPCom.userAgent() }
        }).then(function (result) {
            var likeData = JSON.parse(result.responseText);
            if (likeData.i_like == true)
                likeButton.getElementsByClassName('win-label').item(0).innerText = "Unlike";
            else
                likeButton.getElementsByClassName('win-label').item(0).innerText = "Like";
        }, function (result) {
            //error
            window.console.log(result);
        });

        var followButton = document.getElementById('follow');
        var followUrl = WPCom.apiURL + "/sites/" + item.blog_id + "/follows/mine/";
        WinJS.xhr({
            type: "GET",
            url: followUrl,
            headers: { "Authorization": "Bearer " + accessToken, "User-Agent": WPCom.userAgent() }
        }).then(function (result) {
            var followData = JSON.parse(result.responseText);
            if (followData.is_following == true)
                followButton.getElementsByClassName('win-label').item(0).innerText = "Unfollow";
            else
                followButton.getElementsByClassName('win-label').item(0).innerText = "Follow";
        }, function (result) {
            //error
            window.console.log(result);
        });

        var reblogButton = document.getElementById('reblog');
        var reblogUrl = WPCom.apiURL + "/sites/" + item.blog_id + "/posts/" + item.post_id + "/reblogs/mine/";
        WinJS.xhr({
            type: "GET",
            url: reblogUrl,
            headers: { "Authorization": "Bearer " + accessToken, "User-Agent": WPCom.userAgent() }
        }).then(function (result) {
            var reblogData = JSON.parse(result.responseText);
            if (reblogData.is_reblogged == true)
                reblogButton.getElementsByClassName('win-label').item(0).innerText = "Reblogged";
            else
                reblogButton.getElementsByClassName('win-label').item(0).innerText = "Reblog";
        }, function (result) {
            //error
            window.console.log(result);
        });

    }

    function socialPostClick(m) {
        var accessToken = WPCom.getCurrentAccessToken();

        var socialType = m.target.id;
        var label = m.target.getElementsByClassName('win-label').item(0);
        var url = "";

        if (WPCom.isLoggedIn()) {
            switch (socialType) {
                case 'like':
                    var curText = m.target.innerText;
                    if (curText == "Like") {
                        label.innerText = "Liking...";
                        url = WPCom.apiURL + "/sites/" + item.blog_id + "/posts/" + item.post_id + "/likes/new";
                    } else {
                        label.innerText = "Unliking...";
                        url = WPCom.apiURL + "/sites/" + item.blog_id + "/posts/" + item.post_id + "/likes/mine/delete";
                    }

                    WinJS.xhr({
                        type: "POST",
                        url: url,
                        headers: { "Authorization": "Bearer " + accessToken }
                    }).then(function (result) {
                        var likeData = JSON.parse(result.responseText);
                        if (likeData.i_like == true)
                            label.innerText = "Unlike";
                        else
                            label.innerText = "Like";
                    }, function (result) {
                        //error, reset the button
                        label.innerText = curText;
                        WPCom.displayToastMessage("Sorry, a network error occurred. Please try again later.");
                    });

                    break;
                case 'reblog':
                    var reblogUI = document.getElementById('reblogUI');
                    if (label.innerText != "Reblogged") {
                        var reblogFlyOut = reblogUI.winControl;
                        reblogFlyOut.show(m.target, "top");
                    } else {
                        WPCom.displayToastMessage("You have already reblogged this post.");
                    }

                    break;
                case 'publish-reblog':
                    m.target.innerText = "Publishing...";
                    url = WPCom.apiURL + "/sites/" + item.blog_id + "/posts/" + item.post_id + "/reblogs/new";
                    var reblogButton = document.getElementById('reblog');
                    label = reblogButton.getElementsByClassName('win-label').item(0);
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
                            label.innerText = "Reblogged";
                            var reblogFlyOut = document.getElementById('reblogUI').winControl;
                            reblogFlyOut.hide();
                        }
                        else {
                            label.innerText = "Reblog";
                            m.target.innerText = "Publish";
                            WPCom.displayToastMessage("Sorry, a network error occurred. Please try again later.");
                        }
                    }, function (result) {
                        //error, reset the button
                        label.innerText = "Reblog";
                        m.target.innerText = "Publish";
                        WPCom.displayToastMessage("Sorry, a network error occurred. Please try again later.");
                    });

                    break;
                case 'follow':
                    var curText = m.target.innerText;
                    if (curText == "Follow") {
                        label.innerText = "Following...";
                        url = WPCom.apiURL + "/sites/" + item.blog_id + "/follows/new";
                    } else {
                        label.innerText = "Unfollowing...";
                        url = WPCom.apiURL + "/sites/" + item.blog_id + "/follows/mine/delete";
                    }

                    WinJS.xhr({
                        type: "POST",
                        url: url,
                        headers: { "Authorization": "Bearer " + accessToken }
                    }).then(function (result) {
                        var followData = JSON.parse(result.responseText);
                        if (followData.is_following == true)
                            label.innerText = "Unfollow";
                        else
                            label.innerText = "Follow";
                    }, function (result) {
                        //error, reset the button
                        label.innerText = curText;
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
