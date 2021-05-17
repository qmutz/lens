/**
 * Copyright (c) 2021 OpenLens Authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import React from "react";
import { ipcRenderer } from "electron";
import * as proto from "../../common/protocol-handler";
import Url from "url-parse";
import { autobind } from "../utils";
import { onCorrect } from "../../common/ipc";
import { foldAttemptResults, RouteAttempt } from "../../common/protocol-handler";
import { Notifications } from "../components/notifications";

function verifyIpcArgs(args: unknown[]): args is [string, RouteAttempt] {
  if (args.length !== 2) {
    return false;
  }

  if (typeof args[0] !== "string") {
    return false;
  }

  switch (args[1]) {
    case RouteAttempt.MATCHED:
    case RouteAttempt.MISSING:
    case RouteAttempt.MISSING_EXTENSION:
      return true;
    default:
      return false;
  }
}

export class LensProtocolRouterRenderer extends proto.LensProtocolRouter {
  /**
   * This function is needed to be called early on in the renderers lifetime.
   */
  public init(): void {
    onCorrect({
      channel: proto.ProtocolHandlerInternal,
      source: ipcRenderer,
      verifier: verifyIpcArgs,
      listener: (event, rawUrl, mainAttemptResult) => {
        const rendererAttempt = this._routeToInternal(new Url(rawUrl, true));

        if (foldAttemptResults(mainAttemptResult, rendererAttempt) === RouteAttempt.MISSING) {
          Notifications.info((
            <p>
              Missing handler for <code>{rawUrl}</code>. Are you on the latest version?
            </p>
          ), {
            timeout: 7_500,
          });
        }
      }
    });
    onCorrect({
      channel: proto.ProtocolHandlerExtension,
      source: ipcRenderer,
      verifier: verifyIpcArgs,
      listener: async (event, rawUrl, mainAttemptResult) => {
        const rendererAttempt = await this._routeToExtension(new Url(rawUrl, true));

        switch (foldAttemptResults(mainAttemptResult, rendererAttempt)) {
          case RouteAttempt.MISSING:
            Notifications.info((
              <p>
                Missing handler for <code>{rawUrl}</code>. Are you on the latest version of the extensions?
              </p>
            ), {
              timeout: 7_500,
            });
            break;
          case RouteAttempt.MISSING_EXTENSION:
            Notifications.info((
              <p>
                Missing extension for <code>{rawUrl}</code>. Not able to find extension in our known list. Try installing it manually.
              </p>
            ), {
              timeout: 7_500,
            });
            break;
        }
      }
    });
  }
}
