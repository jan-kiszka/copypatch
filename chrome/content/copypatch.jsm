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

var EXPORTED_SYMBOLS = ["copyPatchInit", "copyPatchDestroy"];

const MENUITEM_MESSAGEPOPUP = "copypatch.messageMenuPopup.copyToClipboard";
const MENUITEM_OTHERACTION = "copypatch.otherAction.copyToClipboard";
const KEYSET_COPYPATCH = "copypatchKeys";
const KEY_COPYPATCH = "key_copyPatch";
const CMD_COPYPATCH = "cmd_copyPatch";

class CopyPatchAddon {
    constructor(window)
    {
        var doc = window.document;

        this.window = window;
        this.ScriptableInputStream =
            Components.Constructor("@mozilla.org/scriptableinputstream;1",
                                   "nsIScriptableInputStream", "init");
        this.clipboardHelper =
            Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                .getService(Components.interfaces.nsIClipboardHelper);
        this.mailContent = doc.getElementById("mailContent");

        var newCmd = doc.createElement("command");
        newCmd.setAttribute("id", CMD_COPYPATCH);
        newCmd.setAttribute("oncommand", "goDoCommand('"+ CMD_COPYPATCH + "')");
        newCmd.setAttribute("disabled", "false");
        doc.getElementById("mailToolbarItems").appendChild(newCmd);

        var newKey = doc.createElement("key");
        newKey.setAttribute("id", KEY_COPYPATCH);
        newKey.setAttribute("key", "p");
        newKey.setAttribute("modifiers", "accel,shift");
        newKey.setAttribute("command", CMD_COPYPATCH);
        var newKeyset = doc.createElement("keyset");
        newKeyset.setAttribute("id", KEYSET_COPYPATCH);
        newKeyset.appendChild(newKey);
        doc.getElementById("mailKeys").appendChild(newKeyset);

        this.createMenuItem(MENUITEM_MESSAGEPOPUP, "openFeedMessage", KEY_COPYPATCH);
        this.createMenuItem(MENUITEM_OTHERACTION, "viewSourceMenuItem", null);

        window.controllers.appendController(this);
    }

    createMenuItem(id, anchor, key)
    {
        var doc = this.window.document;

        var newItem = doc.createElement("menuitem");
        newItem.setAttribute("id", id);
        newItem.setAttribute("label", "Copy as Patch");
        newItem.setAttribute("accesskey", "p");
        if (key)
            newItem.setAttribute("key", key);
        newItem.setAttribute("command", CMD_COPYPATCH);

        var anchorItem = doc.getElementById(anchor).nextSibling;
        anchorItem.parentNode.insertBefore(newItem, anchorItem);
    }

    removeElement(id)
    {
        var elem = this.window.document.getElementById(id);
        elem.parentNode.removeChild(elem);
    }

    destroy()
    {
        this.window.controllers.removeController(this);

        this.removeElement(MENUITEM_MESSAGEPOPUP);
        this.removeElement(MENUITEM_OTHERACTION);
        this.removeElement(KEYSET_COPYPATCH);
        this.removeElement(CMD_COPYPATCH);
    }

    // nsIController methods
    supportsCommand(cmd)
    {
        return (cmd == CMD_COPYPATCH) ? true : false;
    }

    isCommandEnabled(cmd)
    {
        var win = this.window;

        if (cmd != CMD_COPYPATCH)
            return false;

        if (win.document.URL == "chrome://messenger/content/messenger.xul")
            return this.mailContent.getAttribute("selected") == "true" &&
                win.GetNumSelectedMessages() > 0;
        else
            return true;
    }

    doCommand(cmd)
    {
        var win = this.window;

        if (cmd != CMD_COPYPATCH || !this.isCommandEnabled(cmd))
            return;

        var selectedMsg = win.gFolderDisplay.selectedMessage;
        var msgURI = selectedMsg.folder.getUriForMsg(selectedMsg);
        var service = win.messenger.messageServiceFromURI(msgURI);

        service.CopyMessage(msgURI, this, false, null, win.msgWindow, {});
    }

    // nsIStreamListener methods
    onDataAvailable(request, context, inputStream, offset, count)
    {
        var scriptStream = new this.ScriptableInputStream(inputStream);
        this.msg += scriptStream.read(count);
        scriptStream.close();
    }

    onStartRequest(request, context)
    {
        this.msg = "";
    }

    onStopRequest(request, context, code)
    {
        this.clipboardHelper.copyString(this.msg);
    }
}

var windowMap = new Map();

function copyPatchInit(window)
{
    if (window.document.URL == "chrome://messenger/content/messenger.xul" ||
        window.document.URL == "chrome://messenger/content/messageWindow.xul") {
        var addon = new CopyPatchAddon(window);
        windowMap.set(window, addon);
    }
}

function copyPatchDestroy(window)
{
    var addon = windowMap.get(window);
    if (addon) {
        addon.destroy();
        windowMap.delete(window);
    }
}
