(function () {
    "use strict";
    var item;
    // This function is called whenever a user navigates to this page. It
    // populates the page elements with the app's data.
    function ready(element, options) {
    	// TODO: Initialize the fragment here.
    	WPCom.toggleElement(document.getElementById('refresh'), 'hide');
    	WPCom.toggleElement(document.getElementById('openinbrowser'), 'show');

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
        var url = "https://public-api.wordpress.com/rest/v1/sites/" + item.blog_id + "/posts/" + item.post_id + "/likes/mine/";
        WinJS.xhr({
            type: "GET",
            url: url,
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
                    window.console.log('reblog pressed.');

                    break;
                case 'follow':
                    if (m.target.innerText == "Follow") {
                        m.target.innerText = "Unfollow";
                    } else {
                        m.target.innerText = "Follow";
                    }

                    window.console.log('follow pressed.');

                    break;
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
