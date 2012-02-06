/// <reference path="share-target.html" />

// Variable to store the ShareOperation object
var shareOperation = null;

function activatedHandler(eventArgs) {
    // In this sample we only do something if it was activated with the Share contract
    if (!WPCom.isLoggedIn()) {
        WPCom.signInOut();
        return;
    }

    document.getElementById("publish-quote").addEventListener("click", publishPost, false);
    document.getElementById("publish-link").addEventListener("click", publishPost, false);
    //document.getElementById("publish-photo").addEventListener("click", publishPhoto, false);

    if (eventArgs.kind === Windows.ApplicationModel.Activation.ActivationKind.shareTarget) {
        // We receive the ShareOperation object as part of the eventArgs
        shareOperation = eventArgs.shareOperation;

        //there's a description property available as well. Not using this currently...
        //shareOperation.data.properties.description;

        var isQuote = false;
        // Display the data received based on data type
        if (shareOperation.data.contains(Windows.ApplicationModel.DataTransfer.StandardDataFormats.text)) {
            // Let's share a quote!
            document.getElementById("quoteBlogName").innerHTML = "Publishing to " + WPCom.getCurrentBlogURL();
            document.getElementById("shareQuote").style.display = "block";
            shareOperation.data.getTextAsync().then(function (text) { document.getElementById("shareQuoteText").value = text; });
            isQuote = true;
        }
        if (shareOperation.data.contains(Windows.ApplicationModel.DataTransfer.StandardDataFormats.uri)) {
            shareOperation.data.getUriAsync().then(function (uri) {
                if (isQuote) {
                    document.getElementById("shareQuoteURL").value = uri.absoluteUri;
                }
                else {
                    //let's share a link!
                    document.getElementById("linkBlogName").innerHTML = "Publishing to " + WPCom.getCurrentBlogURL();
                    document.getElementById("shareLink").style.display = "block";
                    document.getElementById("shareLinkURL").value = uri.absoluteUri;
                    if (shareOperation.data.properties.title)
                        document.getElementById("shareLinkDescription").value = shareOperation.data.properties.title;
                }
            });
        }
    }
}

function publishPost(m) {
    var accessToken = WPCom.getCurrentAccessToken();
    var blogID = WPCom.getCurrentBlogID();
    if (!blogID) {
        WPCom.displayToastMessage("Sorry, an error occurred.");
        return;
    }

    var progress = document.getElementById("publish-progress");
    progress.style.display = "block";

    m.currentTarget.value = "Publishing...";
    var url = WPCom.apiURL + "/sites/" + blogID + "/posts/new";
    var content;
    var data = new FormData();
    //grab the form values TODO: add validation (empty fields, etc)
    if (m.currentTarget.id == "publish-quote") {
        var quoteText = document.getElementById("shareQuoteText").value;
        var quoteURL = document.getElementById("shareQuoteURL").value;
        content = quoteText + "\n\n<cite>" + "<a href=\"" + quoteURL + "\">" + quoteURL + "</a>"; + "</cite>\n\n";
        data.append("format", "quote");
    } else {
        var linkURL = document.getElementById("shareLinkURL").value;
        var linkDescription = document.getElementById("shareLinkDescription").value;
        var linkComment = document.getElementById("shareLinkComment").value;

        if (linkDescription)
            content = "<a href=\"" + linkURL + "\">" + linkDescription + "</a>";
        else
            content = "<a href=\"" + linkURL + "\">" + linkURL + "</a>";

        if (linkComment)
            content = linkComment + "\n\n" + content + "\n\n";

        data.append("format", "link");
    }

    data.append("content", content);

    WinJS.xhr({
        type: "POST",
        url: url,
        headers: { "Authorization": "Bearer " + accessToken },
        data: data
    }).then(function (result) {
        var resultData = JSON.parse(result.responseText);
        if (resultData.ID)
            reportCompleted();
        else {
            WPCom.displayToastMessage("Sorry, a network error occurred. Please try again later.");
            progress.style.display = "none";
            m.currentTarget.value = "Publish";
        }
    }, function (result) {
        WPCom.displayToastMessage("Sorry, a network error occurred. Please try again later.");
        progress.style.display = "none";
        m.currentTarget.value = "Publish";
    });
}


function reportError() {
    WPCom.displayToastMessage("The sharing operation enountered an error. Please try again.");
}

function reportCompleted() {
    shareOperation.reportCompleted();
    WPCom.displayToastMessage("Post published successfully.");
}

// Initialize the activation handler
Windows.UI.WebUI.WebUIApplication.addEventListener("activated", activatedHandler);
