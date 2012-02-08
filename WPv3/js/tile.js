var WPComTile = {
    data: null,
    tile: null,

    init: function () {
        // Clear existing tile and build them fresh
        WPComTile.clear();

        // Create the new tile
        WPComTile.create();
    },

    create: function () {
        // Make sure we have data
        WPCom.newDataSource('freshlypressed');
        WPComTile.data = WPCom.dataSources.freshlypressed.dataSource;

        if (!WPComTile.data.list.length)
            return;

        var tileUpdateManager = Windows.UI.Notifications.TileUpdateManager.createTileUpdaterForApplication();
        tileUpdateManager.enableNotificationQueue(true);

        // Loop the newest 5 freshly pressed posts.
        for (var i = 0; i < 5; i++) {
            var post = WPComTile.data.list.getAt(i);
            
            if (!post)
                continue;

            // Long Tile
            var template = Windows.UI.Notifications.TileTemplateType.tileWideImageAndText01;
            var tileXml = Windows.UI.Notifications.TileUpdateManager.getTemplateContent(template);
            var tileImageElements = tileXml.getElementsByTagName("image");
            tileImageElements[0].setAttribute("src", post.post_image.replace( '252px,160px', '300px,300px' ) );
            tileImageElements[0].setAttribute("alt", "Post Image");

            var tileTextElements = tileXml.getElementsByTagName("text");
            tileTextElements[0].appendChild(tileXml.createTextNode(post.post_title));

            // Square Tile
            var template = Windows.UI.Notifications.TileTemplateType.tileSquareImage;
            var squareTileXml = Windows.UI.Notifications.TileUpdateManager.getTemplateContent(template);
            var squareTileImageElements = squareTileXml.getElementsByTagName("image");
            squareTileImageElements[0].setAttribute("src", post.post_image);
            squareTileImageElements[0].setAttribute("alt", "Post Image");

            // Add Square to Long tile
            var binding = squareTileXml.getElementsByTagName("binding").item(0);
            var node = tileXml.importNode(binding, true);
            tileXml.getElementsByTagName("visual").item(0).appendChild(node);

            WPComTile.tile = new Windows.UI.Notifications.TileNotification(tileXml);
            WPComTile.send();
        }
    },

    send: function() {
        Windows.UI.Notifications.TileUpdateManager.createTileUpdaterForApplication().update(WPComTile.tile);
    },

    clear: function () {
        WPComTile.data = null;
        WPComTile.tile = null;

        Windows.UI.Notifications.TileUpdateManager.createTileUpdaterForApplication().clear();
    }
}