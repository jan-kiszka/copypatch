/*
 * Copy Patch Thunderbird Add-On
 *
 * Copyright (c) Jan Kiszka, 2019-2020
 *
 * Authors:
 *  Jan Kiszka <jan.kiszka@web.de>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

async function getCurrentWindow()
{
    let windows = await messenger.windows.getAll();

    for (let window of windows) {
        if ((window.type === "messageDisplay" || window.type === "normal")
            && window.focused === true)
            return window;
    }
    return null;
}

function main()
{
    messenger.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "getMsg") {
            return messenger.CopyPatch.getSelectedMessage(sender.tab.windowId);
        }
        if (request.action === "clipboardWrite") {
            navigator.clipboard.writeText(request.text);
        }
    });

    messenger.messageDisplayAction.onClicked.addListener(tab => {
        messenger.tabs.executeScript(tab.id, {file: "content-script.js"});
    });

    messenger.commands.onCommand.addListener(async (name) => {
        if (name !== "copyPatch") {
            return;
        }

        let window = await getCurrentWindow();
        if (window) {
            let tabs = await messenger.tabs.query({windowId: window.id});
            messenger.tabs.executeScript(tabs[0].id, {file: "content-script.js"});
        }
    });
}

main();
