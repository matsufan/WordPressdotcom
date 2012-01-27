﻿// For an introduction to the HTML Fragment template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    // This function is called whenever a user navigates to this page. It
    // populates the page elements with the app's data.
    function ready(element, options) {
        // TODO: Initialize the fragment here.
        var data = JSON.parse(localStorage[options.filter]);
        var post = data.posts[options.key];

        document.title = post.post_title;

        document.querySelector('.title').innerText = post.post_title;

        setInnerHTMLUnsafe(document.querySelector('.content'), post.post_content);

        document.querySelector("div.postActions").addEventListener("click", socialPostClick, false);

        document.querySelector('.meta').innerHTML += '<img src="' + post.author_gravatar.replace('s=96', 's=24') + '" height="24" width="24" />';
        document.querySelector('.meta').innerHTML += 'Posted ' + WPCom.timeSince(post.ts) + ' ago on ' + post.blog_name + ' by ' + post.author_name;

        return; // convenient to set breakpoint :)
    }

    function updateLayout(element, viewState) {
        // TODO: Respond to changes in viewState.
    }

    function socialPostClick(m) {
        var applicationData = Windows.Storage.ApplicationData.current;
        var localSettings = applicationData.localSettings;
        var accessKey = localSettings.values["wpcomAccessKey"];

        var socialType = m.target.className;
        var url = "";

        if (WPCom.isLoggedIn()) {
            switch (socialType) {
                case 'like':
                    if (m.target.innerText == "Like") {
                        m.target.innerText = "Unlike";

                        url = "https://public-api.wordpress.com/rest/v1/sites/6847832/posts/4861/likes/new";
                    } else {
                        m.target.innerText = "Like";

                        url = "https://public-api.wordpress.com/sites/6847832/posts/4861/likes/mine/delete";
                    }

                    WinJS.xhr({
                        type: "POST",
                        url: url,
                        headers: { "Authorization": "Bearer " + accessKey }
                    }).then(function (result) {
                        window.console.log(result); //I can't reach.
                    }, function (result) {
                        window.console.log(result); //I got an error.
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
            window.console.log('needs login.');
        }
    }

    WinJS.UI.Pages.define("/html/post.html", {
        ready: ready,
        updateLayout: updateLayout
    });
})();
