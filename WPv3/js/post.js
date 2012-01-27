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

        document.querySelector('.meta').innerHTML += '<img src="' + item.author_gravatar.replace('s=96', 's=24') + '" height="24" width="24" />';
        document.querySelector('.meta').innerHTML += ' Posted ' + WPCom.timeSince(item.ts) + ' ago on ' + item.blog_name + ' by ' + item.author_name;

        document.querySelector("div.postActions").addEventListener("click", socialPostClick, false);
        document.getElementById('openinbrowser').addEventListener("click", function () { top.location.href = item.permalink; }, false);

        return; // convenient to set breakpoint :)
    }

    function updateLayout(element, viewState) {
        // TODO: Respond to changes in viewState.
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
                    if (m.target.innerText == "Like") {
                        m.target.innerText = "Unlike";

                        url = "https://public-api.wordpress.com/rest/v1/sites/" + item.blog_id + "/posts/" + item.post_id + "/likes/new";
                    } else {
                        m.target.innerText = "Like";

                        url = "https://public-api.wordpress.com/rest/v1/sites/" + item.blog_id + "/posts/" + item.post_id + "/likes/mine/delete";
                    }

                    WinJS.xhr({
                        type: "POST",
                        url: url,
                        headers: { "Authorization": "Bearer " + accessToken }
                    }).then(function (result) {
                        window.console.log(result); 
                    }, function (result) {
                        //error
                        window.console.log(result); 
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
