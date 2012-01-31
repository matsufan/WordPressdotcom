(function () {
    "use strict";

    var app = WinJS.Application;

    // This function responds to all application activations.
    app.onactivated = function (eventObject) {
        if (eventObject.detail.kind === Windows.ApplicationModel.Activation.ActivationKind.launch) {
            // Initializing your application here.
            WPCom.checkLocalStorageSchemaVersion();
            WinJS.UI.processAll();
        	WPCom.updateSignInOutButton();
        }
    };

    app.start();
})();
