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

function initWindow(window)
{
    if (window.document.readyState == "complete") {
        copyPatchInit(window);
    } else {
        window.addEventListener("load", function listener() {
                copyPatchInit(window);
            }, { once: true });
    }
}

var WindowListener = {
    onOpenWindow: function(xulWindow)
    {
        initWindow(xulWindow.docShell.domWindow);
    },

    onCloseWindow: function(xulWindow)
    {
        copyPatchDestroy(xulWindow.docShell.domWindow);
    },

    onWindowTitleChange: function(xulWindow, newTitle) { },
};

function forEachOpenWindow(todo)
{
    var windows = Services.wm.getEnumerator(null);
    while (windows.hasMoreElements()) {
        todo(windows.getNext());
    }
}

function startup(data, reason)
{
    Components.utils.import("chrome://copypatch/content/copypatch.jsm");

    forEachOpenWindow(initWindow);
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
