(function () {
    "use strict";

    var app = WinJS.Application;

    // This function responds to all application activations.
    app.onactivated = function (eventObject) {
        if (eventObject.detail.kind === Windows.ApplicationModel.Activation.ActivationKind.launch) {
            // TODO: Initialize your application here.

        	WinJS.UI.processAll();

        	WPCom.updateSignInOutButton();
        }
    };

    app.start();
})();
