(function () {
    "use strict";

    var app = WinJS.Application;

    // This function responds to all application activations.
    app.onactivated = function (eventObject) {
        if (eventObject.detail.kind === Windows.ApplicationModel.Activation.ActivationKind.launch) {
            // Initializing your application here.

        	var settingsPane = Windows.UI.ApplicationSettings.SettingsPane.getForCurrentView();
        	settingsPane.addEventListener('commandsrequested', settingsCommandsRequested);

        	WPCom.checkLocalStorageSchemaVersion();
        	WinJS.UI.processAll();

            // Update the tile
        	WPComTile.init();
        }
    };

    function settingsCommandsRequested(e) {
    	var n = Windows.UI.ApplicationSettings;
    	var vector = e.request.applicationCommands;
    	var signInOutText = 'Sign In';
    	if (WPCom.isLoggedIn())
    		signInOutText = 'Sign Out';
    	vector.append(new n.SettingsCommand('signinout', signInOutText, WPCom.signInOut));
    }

    app.start();
})();
