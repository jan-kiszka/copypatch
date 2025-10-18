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

import { dialogWarn, dialogConfirm } from "./dialog.js"

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

async function parseDisplayName(addr)
{
    const parsed = await messenger.messengerUtilities.parseMailboxString(addr);
    return (parsed.length > 0) ? parsed[0] : { name: null, email: addr };
}

/* Find first text/plain body */
function getBody(parts)
{
    /* First check all parts in this level */
    for (const part of parts) {
        if (part.body && part.contentType == "text/plain") {
            return part.body;
        }
    }
    /* Now check all subparts */
    for (const part of parts) {
        if (part.parts) {
            const body = getBody(part.parts);
            if (body) {
                return body;
            }
        }
    }
    return null;
}

async function getMsgData(messageId)
{
    const full = await messenger.messages.getFull(messageId);

    const body = getBody(full.parts);
    if (!body) {
        return null;
    }

    const date = await getFirstHeader(full.headers["date"]);
    const from = await getAllHeader(full.headers["from"]);
    const replyTo = await getAllHeader(full.headers["reply-to"]);
    const subject = await getFirstHeader(full.headers["subject"]);

    const fromParsed = from ?
        await Promise.all(from.map(addr => parseDisplayName(addr))) : from;
    const replyToParsed = replyTo ?
        await Promise.all(replyTo.map(addr => parseDisplayName(addr))) : replyTo;

    return {
        header: {
            date: date ? new Date(date) : date,
            from: fromParsed,
            replyTo: replyToParsed,
            subject: subject
        },
        body: body,
        isPatch: (body.indexOf("\n---") >= 0 && body.indexOf("\n+++") >= 0) ||
                 body.indexOf("\ndiff --git") >= 0
    }
}

function formatAddress(addressObject)
{
    if (addressObject.name) {
        /*
         * Strip "[ext]" tag in front of the sender name, proudly presented by
         * Siemens IT for emails with Siemens addresses coming in via external
         * lists.
         */
        const name = addressObject.name.replace(/^\[ext\] /, "");

        return name + " <" + addressObject.email + ">";
    } else {
        return addressObject.email;
    }
}

function replaceAngleBrackets(str)
{
    return str.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

async function copyPatch(tabId)
{
    const msgList = await messenger.messageDisplay.getDisplayedMessages(tabId);
    if (msgList.messages.length != 1) {
        return;
    }

    const msg = await getMsgData(msgList.messages[0].id);

    let patch = "";
    let result = {terminated: false};

    patch += "From: " + formatAddress(msg.header.from[0]) + "\n";
    patch += "Date: " + msg.header.date + "\n";
    patch += "Subject: " + msg.header.subject + "\n\n";

    /* Strip Windows line-feeds */
    patch += msg.body.replace(/\r/g, "");

    /* Get rid of O365 unsafe links */
    patch = patch.replaceAll(
        /https:\/\/[^\.]+\.safelinks\.protection\.outlook\.com\/\?url=([^&]*)&[-+a-zA-Z0-9%&/=.;]*/g,
        function(match, p1, offset, string) {
            return decodeURIComponent(p1);
        });

    /* Cut off mailing list signatures after git's default */
    patch = patch.replace(/(^-- \n[0-9\.]+\n)[^]*/m, "$1");

    let signedOffIndex = patch.indexOf("\nSigned-off-by: ");
    if (signedOffIndex >= 0) {
        /* Temporarily add a newline at the beginning to simplify matching. */
        patch = "\n" + patch;
        signedOffIndex += 1;

        const patchHead = patch.split("\n---\n")[0];
        let lastFrom = null;

        const lastFromStart = patchHead.lastIndexOf("\nFrom: ");
        if (lastFromStart >= 0) {
            const lastFromEnd = patchHead.indexOf("\n", lastFromStart + 1);
            if (lastFromEnd >= 0)
                lastFrom = patchHead.substring(lastFromStart + 7, lastFromEnd);
        }

        if (!lastFrom) {
            result = await dialogWarn(tabId,
                                      "<b>WARNING:</b> No valid author found.");
        } else if (patchHead.indexOf("\nSigned-off-by: " + lastFrom) < 0) {
            let replyTo = null;
            if (msg.header.replyTo) {
                replyTo = formatAddress(msg.header.replyTo[0]);
            }
            if (replyTo && patchHead.indexOf("\nSigned-off-by: " + replyTo) >= 0) {
                patch = patch.replaceAll("\nFrom: " + lastFrom + "\n",
                                         "\nFrom: " + replyTo + "\n");
            } else {
                let signedOffEnd = patchHead.indexOf("\n", signedOffIndex + 1);
                if (signedOffEnd < 0) {
                    signedOffEnd = patchHead.length;
                }
                const signer = patchHead.substring(signedOffIndex + 16,
                                                   signedOffEnd);
                result = await dialogConfirm(tabId,
                    "<b>WARNING:</b> Author and signed-off addresses differ.<br><br>" +
                    "<table cellspacing=0 cellpadding=0><tr>" +
                    "<td valign=top>Author:&nbsp;</td><td>" + replaceAngleBrackets(lastFrom) + "</td>" +
                    "</tr><tr>"+
                    "<td valign=top>Signer:&nbsp;</td><td>" + replaceAngleBrackets(signer) + "</td>" +
                    "</tr></table><br>" +
                    "Set author to signer address?");
                if (result.confirmed) {
                    patch = patch.replaceAll("\nFrom: " + lastFrom + "\n",
                                             "\nFrom: " + signer + "\n");
                }
            }
        }

        /* Remove leading newline again. */
        patch = patch.substring(1);
    } else {
        result = await dialogWarn(tabId,
                                  "<b>WARNING:</b> No signed-off tag found.");
    }

    if (!result.terminated) {
        navigator.clipboard.writeText(patch);

        messenger.messageDisplayAction.setBadgeBackgroundColor(
            {tabId: tabId, color: "green"});
        messenger.messageDisplayAction.setBadgeText(
            {tabId: tabId, text: "✔"});
        setTimeout(() => {
            messenger.messageDisplayAction.setBadgeText(
                {tabId: tabId, text: null});
        }, 500);
    }
}

async function main()
{
    messenger.messageDisplayAction.disable();

    messenger.messageDisplayAction.onClicked.addListener(tab => {
        copyPatch(tab.id);
    });

    messenger.commands.onCommand.addListener(async (name, tab) => {
        if (name !== "copyPatch") {
            return;
        }

        if (await messenger.messageDisplayAction.isEnabled({tabId: tab.id})) {
            copyPatch(tab.id);
        }
    });

    async function updateMessageDisplayAction(tabId, msgList)
    {
        const msg = msgList.messages.length === 1 ?
            await getMsgData(msgList.messages[0].id) : null;

        if (msg && msg.isPatch) {
            messenger.messageDisplayAction.enable(tabId);
        } else {
            messenger.messageDisplayAction.disable(tabId);
        }
    }

    messenger.messageDisplay.onMessagesDisplayed.addListener((tab, msgList) => {
        updateMessageDisplayAction(tab.id, msgList);
    });

    const windows = await messenger.windows.getAll({
        populate: true,
        windowTypes: ["normal", "messageDisplay"]
    });
    for (const window of windows) {
        for (const tab of window.tabs) {
            const msgList = await messenger.messageDisplay.getDisplayedMessages(tab.id);
            updateMessageDisplayAction(tab.id, msgList);
        }
    }
}

main();
