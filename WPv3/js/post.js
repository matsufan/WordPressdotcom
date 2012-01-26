// For an introduction to the HTML Fragment template, see the following documentation:
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

        document.querySelector("span.like").addEventListener("click", likePostClick, false);

        document.querySelector('.meta').innerHTML += '<img src="' + post.author_gravatar.replace('s=96', 's=24') + '" height="24" width="24" />';
        document.querySelector('.meta').innerHTML += 'Posted ' + WPCom.timeSince(post.ts) + ' ago on ' + post.blog_name + ' by ' + post.author_name;

        return; // convenient to set breakpoint :)
    }

    function updateLayout(element, viewState) {
        // TODO: Respond to changes in viewState.
    }

    function likePostClick(mouseEventInfo) {
        


        /*WinJS.xhr({
            type: "POST",
            url: "https://public-api.wordpress.com/rest/v1",
            headers: { "Content-type": "application/x-www-form-urlencoded" },
            data: requestData
        }).then(function (result) {
            window.console.log(result);//I can't reach.
        }, function (result) {
            window.console.log(result);//I got status 0.
        });*/

        if (WPCom.isLoggedIn()) {
            
        }
        else {
            //launch oauth signon
        }
    }

    WinJS.UI.Pages.define("/html/post.html", {
        ready: ready,
        updateLayout: updateLayout
    });
})();
