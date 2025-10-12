/*
 * Copy Patch Thunderbird Add-On
 *
 * Copyright (c) Jan Kiszka, 2025
 *
 * Authors:
 *  Jan Kiszka <jan.kiszka@web.de>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

async function showDialog(content, confirmMode)
{
    const div = document.createElement("div");

    div.innerHTML = `
        <style>
          dialog:open {
            border: 1px solid;
            box-shadow: 10px 10px 60px -20px rgba(0, 0, 0, 0.75);
            padding: 16px 16px;
          }
          dialog::backdrop {
            background-color: grey;
            opacity: 0.5;
          }
          button {
            border: none;
            border-radius: 5px;
            color: white;
            background-color: #2493ef;
            font-size: 16px;
            font-weight: bold;
            padding: 8px 16px;
          }
          button:hover {
            background-color: #1f7dcb;
          }
          button:focus-visible {
            outline: 2px solid #1f7dcb;
            outline-offset: 2px;
          }
          .button_cancel {
            color: black;
            background-color: #efeff2;
          }
          .button_cancel:hover {
            background-color: #d8d8d9;
          }
          div {
            font-size: 16px;
          }
        </style>

        <dialog id="copypatch-dialog">

        <table>
          <tr>
            <td valign="top"><img id="copypatch-img"></td>
            <td width="10px"/>
            <td><div id=copypatch-content></div></td>
          </tr>
        </table>

        <br>

        <table>
          <tr>
            <td width="100%"/>
            <td>
              <button id="copypatch-cancel" class="button_cancel" accesskey="c" hidden="true">
                <u>C</u>ancel
              </button>
            </td>
            <td witdh="10px"/>
            <td>
              <button id="copypatch-ok" accesskey="o" autofocus>
                <u>O</u>K
              </button>
            </td>
          </tr>
        </table>

        </dialog>
    `;
    document.body.insertBefore(div, document.body.firstChild);

    const img = document.getElementById("copypatch-img");
    img.src = await messenger.runtime.getURL(
        confirmMode ? "question.png" : "warning.png");

    const contentDiv = document.getElementById("copypatch-content");
    contentDiv.innerHTML = content;

    const dlg = document.getElementById("copypatch-dialog");

    const okButton = document.getElementById("copypatch-ok");
    okButton.addEventListener("click", () => {
        dlg.close("confirm");
    });

    if (confirmMode) {
        const cancelButton = document.getElementById("copypatch-cancel");
        cancelButton.hidden = false;
        cancelButton.addEventListener("click", () => {
            dlg.close();
        });
    }

    let altPressed = false;
    dlg.addEventListener("keydown", (event) => {
        switch (event.key) {
        case "Alt":
            altPressed = true;
            break;
        case "o":
            if (altPressed) {
                dlg.close("confirm");
            }
            break;
        case "c":
            if (confirmMode && altPressed) {
                dlg.close();
            }
            break;
        }
    });
    dlg.addEventListener("keyup", (event) => {
        if (event.key === "Alt") {
            altPressed = false;
        }
    });

    return await new Promise(resolve => {
        dlg.addEventListener("close", (event) => {
            const parent = div.parentNode;
            if (parent) {
                parent.removeChild(div);
            }
            resolve(dlg.returnValue ? true : !confirmMode);
        });
        dlg.showModal();
    });
}

async function dialog(tabId, content, confirmMode)
{
    messenger.messageDisplayAction.disable(tabId);

    const injResults = await messenger.scripting.executeScript({
        target: {tabId: tabId},
        func: showDialog,
        args: [content, confirmMode]
    });

    messenger.messageDisplayAction.enable(tabId);

    return injResults[0].result;
}

export async function dialogWarn(tabId, content)
{
    return dialog(tabId, content, false);
}

export async function dialogConfirm(tabId, content)
{
    return dialog(tabId, content, true);
}
