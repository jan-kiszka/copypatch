/*
 * Copy Patch Thunderbird Add-On
 *
 * Copyright (c) Jan Kiszka, 2019-2025
 * Copyright (c) John Bieling, 2023
 *
 * Authors:
 *  Jan Kiszka <jan.kiszka@web.de>
 *  John Bieling <john.bieling@gmx.de>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import "./node_modules/email-addresses/lib/email-addresses.js";

function getFirstHeader(arr)
{
    if (Array.isArray(arr) && arr.length > 0) {
        return arr[0];
    }
    return undefined;
}

function getAllHeader(arr)
{
    if (Array.isArray(arr) && arr.length > 0) {
        return arr;
    }
    return undefined;
}

function parseDisplayName(addr)
{
    let rv = emailAddresses.parseOneAddress(addr);
    return {
        name: rv ? rv.name : null,
        email: rv ? rv.address: addr,
    }
}

/* Find first text/plain body */
function getBody(parts)
{
    /* First check all parts in this level */
    for (let part of parts) {
        if (part.body && part.contentType == "text/plain") {
            return part.body;
        }
    }
    /* Now check all subparts */
    for (let part of parts) {
        if (part.parts) {
            let body = getBody(part.parts);
            if (body) {
                return body;
            }
        }
    }
    return null;
}

async function getMsgData(messageId)
{
    let full = await browser.messages.getFull(messageId);
    let date = await getFirstHeader(full.headers["date"]);
    let from = await getAllHeader(full.headers["from"]);
    let replyTo = await getAllHeader(full.headers["reply-to"]);
    let subject = await getFirstHeader(full.headers["subject"]);
    let body = getBody(full.parts);

    if (!body) {
        return null;
    }

    return {
        header: {
            date: date ? new Date(date) : date,
            from: from ? from.map(addr => parseDisplayName(addr)) : from,
            replyTo: replyTo ? replyTo.map(addr => parseDisplayName(addr)) : replyTo,
            subject: subject
        },
        body: body,
        isPatch: (body.indexOf("\n---") >= 0 && body.indexOf("\n+++") >= 0) ||
                 body.indexOf("\ndiff --git") >= 0
    }
}

function main()
{
    messenger.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "getMsg") {
            return browser.messageDisplay.getDisplayedMessage(sender.tab.id).then(
                msg => getMsgData(msg.id)
            );
        }
        if (request.action === "clipboardWrite") {
            navigator.clipboard.writeText(request.text);

            messenger.messageDisplayAction.setBadgeBackgroundColor(
                {tabId: sender.tab.id, color: "green"});
            messenger.messageDisplayAction.setBadgeText(
                {tabId: sender.tab.id, text: "✔"});
            setTimeout(() => {
                messenger.messageDisplayAction.setBadgeText(
                    {tabId: sender.tab.id, text: null});
            }, 500);
            return Promise.resolve();
        }
        return false;
    });

    messenger.messageDisplayAction.onClicked.addListener(tab => {
        messenger.tabs.executeScript(tab.id, {file: "content-script.js"});
    });

    messenger.commands.onCommand.addListener(async (name, tab) => {
        if (name !== "copyPatch") {
            return;
        }

        if (await messenger.messageDisplayAction.isEnabled({tabId: tab.id})) {
            messenger.tabs.executeScript(tab.id, {file: "content-script.js"});
        }
    });

    messenger.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
        let msg = null;

        if (message) {
            msg = await getMsgData(message.id);
        }

        if (msg && msg.isPatch) {
            messenger.messageDisplayAction.enable(tab.id);
        } else {
            messenger.messageDisplayAction.disable(tab.id);
        }
    });
}

main();
