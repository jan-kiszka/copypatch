/*
 * Copy Patch Thunderbird Add-On
 *
 * Copyright (c) Jan Kiszka, 2019
 *
 * Authors:
 *  Jan Kiszka <jan.kiszka@web.de>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

Components.utils.import("resource://gre/modules/Services.jsm");

var WindowListener = {
    onOpenWindow: function(xulWindow)
    {
        var window = xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                              .getInterface(Components.interfaces.nsIDOMWindow);

        window.addEventListener("load", function listener() {
                window.removeEventListener("load", listener);
                copyPatchInit(window);
            });
    },

    onCloseWindow: function(xulWindow)
    {
        var window = xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                              .getInterface(Components.interfaces.nsIDOMWindow);
        copyPatchDestroy(window);
    },

    onWindowTitleChange: function(xulWindow, newTitle) { },
};

function forEachOpenWindow(todo)
{
    var windows = Services.wm.getEnumerator(null);
    while (windows.hasMoreElements()) {
        todo(windows.getNext().QueryInterface(Components.interfaces.nsIDOMWindow));
    }
}

function startup(data, reason)
{
    Components.utils.import("chrome://copypatch/content/copypatch.jsm");

    forEachOpenWindow(copyPatchInit);
    Services.wm.addListener(WindowListener);
}

function shutdown(data,reason)
{
    if (reason == APP_SHUTDOWN)
        return;

    forEachOpenWindow(copyPatchDestroy);
    Services.wm.removeListener(WindowListener);

    Components.utils.unload("chrome://copypatch/content/copypatch.jsm");

    Services.obs.notifyObservers(null, "chrome-flush-caches", null);
}

function install(data, reason) { }
function uninstall(data, reason) { }
