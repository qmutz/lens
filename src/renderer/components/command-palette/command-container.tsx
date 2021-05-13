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


import "./command-container.scss";
import { action, observable } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { Dialog } from "../dialog";
import { subscribeToBroadcast } from "../../../common/ipc";
import { CommandDialog } from "./command-dialog";
import { CommandRegistration, CommandRegistry } from "../../../extensions/registries/command-registry";
import { CommandOverlay } from "./command-overlay";

@observer
export class CommandContainer extends React.Component<{ clusterId?: string }> {
  @observable.ref commandComponent: React.ReactElement;

  private escHandler(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      this.closeDialog();
    }
  }

  @action
  private closeDialog() {
    this.commandComponent = null;
  }

  private findCommandById(commandId: string) {
    return CommandRegistry.getInstance().getItems().find((command) => command.id === commandId);
  }

  private runCommand(command: CommandRegistration) {
    command.action({
      entity: CommandRegistry.getInstance().activeEntity
    });
  }

  componentDidMount() {
    if (this.props.clusterId) {
      subscribeToBroadcast(`command-palette:run-action:${this.props.clusterId}`, (event, commandId: string) => {
        const command = this.findCommandById(commandId);

        if (command) {
          this.runCommand(command);
        }
      });
    } else {
      subscribeToBroadcast("command-palette:open", () => {
        CommandOverlay.open(<CommandDialog />);
      });
    }
    window.addEventListener("keyup", (e) => this.escHandler(e), true);
    CommandOverlay.on((event) => {
      this.commandComponent = event.component;
    });
  }

  render() {
    return (
      <Dialog isOpen={!!this.commandComponent} animated={true} onClose={() => this.commandComponent = null} modal={false}>
        <div id="command-container">
          {this.commandComponent}
        </div>
      </Dialog>
    );
  }
}
