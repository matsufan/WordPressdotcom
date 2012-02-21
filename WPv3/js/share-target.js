/// <reference path="share-target.html" />

// Variable to store the ShareOperation object
var shareOperation = null;
var TYPE_IMAGE = 0;
var TYPE_QUOTE = 1;
var TYPE_LINK = 2;
var shareType;
var imageBase64;

function activatedHandler(eventArgs) {
	// In this sample we only do something if it was activated with the Share contract
    if (!WPCom.isLoggedIn())
        WPCom.signInOut();

    document.getElementById("publish-quote").addEventListener("click", publishPost, false);
    document.getElementById("publish-link").addEventListener("click", publishPost, false);
    document.getElementById("publish-image").addEventListener("click", publishPost, false);

    if (eventArgs.kind === Windows.ApplicationModel.Activation.ActivationKind.shareTarget) {
        // We receive the ShareOperation object as part of the eventArgs
        shareOperation = eventArgs.shareOperation;

        // Display the data received based on data type
        if (shareOperation.data.properties.thumbnail) {
            //load the thumbnail if one was provided
            shareOperation.data.properties.thumbnail.openReadAsync().then(function (thumbnailStream) {
                var thumbnailBlob = MSApp.createBlobFromRandomAccessStream(thumbnailStream.contentType, thumbnailStream);
                var thumbnailUrl = URL.createObjectURL(thumbnailBlob, false);
                document.getElementById("thumbnailImage").src = thumbnailUrl;
                document.getElementById("thumbnailArea").style.display = "block";
            });
        }

        if (shareOperation.data.contains(Windows.ApplicationModel.DataTransfer.StandardDataFormats.bitmap)) {
            //Let's share an image!
            shareType = TYPE_IMAGE;
            WPCom.toggleElement(document.getElementById("shareImage"), 'show');
            updateForPublishing();
            if (shareOperation.data.properties.title)
                document.getElementById("shareImageTitle").value = shareOperation.data.properties.title;
            if (shareOperation.data.properties.description)
                document.getElementById("shareImageCaption").value = shareOperation.data.properties.description;

            shareOperation.data.getBitmapAsync().then(function (streamRef) {
               streamRef.openReadAsync().then(function (imageStream) {
                   if (imageStream) {
                       var reader = new Windows.Storage.Streams.DataReader(imageStream);
                       var promise = reader.loadAsync(imageStream.size).then(function (readSize) {
                           var buffer = reader.readBuffer(readSize);
                           imageBase64 = Windows.Security.Cryptography.CryptographicBuffer.encodeToBase64String(buffer);
                       }, function (result) {
                          // error
                       });

                       var fullimageBlob = MSApp.createBlobFromRandomAccessStream(imageStream.contentType, imageStream);
                       var fullimagelUrl = URL.createObjectURL(fullimageBlob, false);
                       document.getElementById("fullimageImage").src = fullimagelUrl;
                   }
                });
            });
        }
        if (shareOperation.data.contains(Windows.ApplicationModel.DataTransfer.StandardDataFormats.text)) {
            // Let's share a quote!
            if (shareType != TYPE_IMAGE) {
                shareType = TYPE_QUOTE;
                WPCom.toggleElement(document.getElementById("shareQuote"), 'show');
                updateForPublishing();
                shareOperation.data.getTextAsync().then(function (text) { document.getElementById("shareQuoteText").value = text; });

                var pageUrl = shareOperation.data.properties.description;
                var pageTitle;

                WinJS.xhr({
                    type: "GET",
                    url: pageUrl
                }).then(function (result) {
                    pageTitle = result.responseText.match(/.*<title.*>(.*)<\/title>.*/)[1];
                    
                    if (!pageTitle) {
                        pageTitle = pageUrl;
                    }

                    document.getElementById("shareQuoteURL").value = '<cite><a href="' + pageUrl + '">' + pageTitle + '</a></cite>';
                }, function (result) {
                    pageTitle = pageUrl;

                    document.getElementById("shareQuoteURL").value = '<cite><a href="' + pageUrl + '">' + pageTitle + '</a></cite>';
                });

            }
        }

        if (shareOperation.data.contains(Windows.ApplicationModel.DataTransfer.StandardDataFormats.uri)) {
            shareOperation.data.getUriAsync().then(function (uri) {
                if (shareType == TYPE_QUOTE) {
                    document.getElementById("shareQuoteURL").value = uri.absoluteUri;
                }
                else if (shareType != TYPE_IMAGE) {
                	//let's share a link!
                	WPCom.toggleElement(document.getElementById("shareLink"), 'show');
                	updateForPublishing();
                	document.getElementById("shareLinkURL").value = uri.absoluteUri;
                    if (shareOperation.data.properties.title)
                        document.getElementById("shareLinkDescription").value = shareOperation.data.properties.title;
                }
            });
        }
    }
}

function publishPost(m) {
    var button = m.currentTarget;
    var progress = document.getElementById("publish-progress");
    progress.style.display = "block";

    button.value = "Publishing...";
    var content;
    var data = new FormData();
    //grab the form values TODO: add validation (empty fields, etc)
    if (button.id == "publish-image") {
        if (imageBase64) {
            //upload the image via xmlrpc first
            var accessToken = WPCom.getCurrentAccessToken();
            var timestamp = new Date().getTime() + ".jpg";
            var xmlrpcURL = "http://" + WPCom.getCurrentBlogURL() + "/xmlrpc.php";
            var xmlString = '<?xml version="1.0" ?><methodCall><methodName>wp.uploadFile</methodName><params><param><value><i4>1</i4></value></param><param><value><string>username</string></value></param><param><value><string>password</string></value></param><param><value><struct><member><name>type</name><value><string>image/jpeg</string></value></member><member><name>overwrite</name><value><boolean>1</boolean></value></member><member><name>bits</name><value><base64>' + imageBase64 + '</base64></value></member><member><name>name</name><value><string>' + timestamp + '</string></value></member></struct></value></param></params></methodCall>';
            WinJS.xhr({
                type: "POST",
                url: xmlrpcURL,
                headers: { "Authorization": "Bearer " + accessToken },
                data: xmlString
            }).then(function (result) {
                var xmlDoc = result.responseXML;
                var values = xmlDoc.getElementsByTagName("string");
                var imageURL;
                for (var i = 0; i < values.length; i++) {
                    //look for the image URL
                    if (values[i].nodeTypedValue.indexOf("http://") >= 0) {
                        imageURL = values[i].nodeTypedValue;
                    }
                }

                if (imageURL) {
                    //if we have an image url, build out the post content
                    var imageTitle = document.getElementById("shareImageTitle").value;
                    var imageLink = document.getElementById("shareImageURL").value;
                    var imageCaption = document.getElementById("shareImageCaption").value;
                    var imageWidth = document.getElementById("fullimageImage").naturalWidth;

                    content = '<img src="' + imageURL + '" title="' + imageTitle + '" alt="" />';
                    if (imageLink)
                        content = '<a href="' + imageLink + '">' + content + '</a>';
                    if (imageCaption)
                        content = '[caption id="" width="' + imageWidth + '" caption="' + imageCaption + '"]' + content + '[/caption]';

                    if (imageTitle.length > 25) {
                        data.append("title", imageTitle.substring(0, 25) + "...");
                    } else {
                        data.append("title", imageTitle);
                    }

                    data.append("format", "image");
                    data.append("content", content);

                    createNewPost(data, button);
                }
                else {
                    document.getElementById("errorMessage").innerText = "Sorry, a network error occurred. Please try again later.";
                    progress.style.display = "none";
                    button.value = "Publish";
                }
            }, function (result) {
                document.getElementById("errorMessage").innerText = "Sorry, a network error occurred. Please try again later.";
                progress.style.display = "none";
                button.value = "Publish";
            });
        }
    }
    else if (button.id == "publish-quote") {
        var quoteText = document.getElementById("shareQuoteText").value;
        var quoteURL = document.getElementById("shareQuoteURL").value;
        if (quoteText) {
            content = "<blockquote>" + quoteText + "</blockquote>";
        }

        if (quoteURL) {
            content += "\n\n" + quoteURL + "\n\n";
        }

        if (quoteText.length > 25) {
            data.append("title", quoteText.substring(0, 25) + "...");
        } else {
            data.append("title", quoteText);
        }

        data.append("format", "quote");
        data.append("content", content);

        createNewPost(data, button);
    } else {
        var linkURL = document.getElementById("shareLinkURL").value;
        var linkDescription = document.getElementById("shareLinkDescription").value;
        var linkComment = document.getElementById("shareLinkComment").value;

        if (linkDescription)
            content = "<a href=\"" + linkURL + "\">" + linkDescription + "</a>";
        else
            content = "<a href=\"" + linkURL + "\">" + linkURL + "</a>";

        if (linkComment)
            content = content + "\n\n" + linkComment + "\n\n";

        data.append("format", "link");
        data.append("content", content);

        createNewPost(data, button);
    }
}

function createNewPost(data, button) {
    var accessToken = WPCom.getCurrentAccessToken();
    var blogID = WPCom.getCurrentBlogID();
    var progress = document.getElementById("publish-progress");
    if (!blogID) {
        document.getElementById("errorMessage").innerText = "Sorry, an error occurred.";
        return;
    }
    var url = WPCom.apiURL + "/sites/" + blogID + "/posts/new";
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
            document.getElementById("errorMessage").innerText = "Sorry, a network error occurred. Please try again later.";
            progress.style.display = "none";
            button.value = "Publish";
        }
    }, function (result) {
        document.getElementById("errorMessage").innerText = "Sorry, a network error occurred. Please try again later.";
        progress.style.display = "none";
        button.value = "Publish";
    });
}


function reportError() {
    document.getElementById("errorMessage").innerText = "The sharing operation enountered an error. Please try again.";
}

function reportCompleted() {
    shareOperation.reportCompleted();
}

// Initialize the activation handler
Windows.UI.WebUI.WebUIApplication.addEventListener("activated", activatedHandler);

Windows.Storage.ApplicationData.current.addEventListener('datachanged', updateForPublishing);
function updateForPublishing(e) {
	var message;
	if (WPCom.isLoggedIn()) {
		message = "Publishing to " + WPCom.getCurrentBlogURL();
		if (WinJS.Utilities.hasClass(document.getElementById('shareImage'), 'show')) {
			WPCom.toggleElement(document.getElementById('publish-image'), 'show');
			document.getElementById("imageBlogName").innerHTML = message;
		} else if (WinJS.Utilities.hasClass(document.getElementById('shareLink'), 'show')) {
			WPCom.toggleElement(document.getElementById('publish-link'), 'show');
			document.getElementById("linkBlogName").innerHTML = message;
		} else if (WinJS.Utilities.hasClass(document.getElementById('shareQuote'), 'show')) {
			WPCom.toggleElement(document.getElementById('publish-quote'), 'show');
			document.getElementById("quoteBlogName").innerHTML = message;
		}
	} else {
		message = 'Please <a href="#" class="signinout">Sign In</a> to continue publishing';
		if (WinJS.Utilities.hasClass(document.getElementById('shareImage'), 'show')) {
			WPCom.toggleElement(document.getElementById('publish-image'), 'hide');
			setInnerHTMLUnsafe(document.getElementById('imageBlogName'), message);
		} else if (WinJS.Utilities.hasClass(document.getElementById('shareLink'), 'show')) {
			WPCom.toggleElement(document.getElementById('publish-link'), 'hide');
			setInnerHTMLUnsafe(document.getElementById('linkBlogName'), message);
		} else if (WinJS.Utilities.hasClass(document.getElementById('shareQuote'), 'show')) {
			WPCom.toggleElement(document.getElementById('publish-quote'), 'hide');
			setInnerHTMLUnsafe(document.getElementById('quoteBlogName'), message);
		}
	}
}
