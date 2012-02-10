(function () {
    function initializeShareSource() {
        setupShare();
        // we'd bind a share button's click to showShareUI() here
    }

    function setupShare() {
        var dataTransferManager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
        dataTransferManager.addEventListener("datarequested", function (e) {
            var request = e.request;
            uriDataRequestedHandler(request);
        });
    }

    function showShareUI() {
        // if we ever want a share button, just assign this onlick
        Windows.ApplicationModel.DataTransfer.DataTransferManager.showShareUI();
    }

    function uriDataRequestedHandler(request) {
        var postEl = document.querySelector('.post');
        if (null != postEl && WinJS.Utilities.hasClass(postEl, 'fragment')) {
            // we're in single post view
            var post_key = postEl.getAttribute('id');
            if (null == post_key)
                return; // can't find a post key
            var split = post_key.split('-');
            if (2 !== split.length)
                return; // won't be able to define the filter and actual post key
            var filter = split[0];
            post_key = split[1];
            if (null == filter || null == post_key)
                return; // can't figure out the filter or post_key
            var lsPost = JSON.parse(localStorage[filter]).posts[post_key];
            if (null == lsPost)
                return; // can't find the matching localStorage post for extra props
            request.data.setUri(new Windows.Foundation.Uri(lsPost.short_URL));
            request.data.properties.title = postEl.querySelector('.title').innerText;
            request.data.properties.description = postEl.querySelector('.content').innerText.substring(0, 50);
        } else {
            // we're not in a single post view, let's promote WordPress.com
            request.data.setUri(new Windows.Foundation.Uri('http://wordpress.com'));
            request.data.properties.title = 'WordPress.com';
            request.data.properties.description = "Your blogging home!";
        }
    }

    document.addEventListener("DOMContentLoaded", initializeShareSource, false);
})();