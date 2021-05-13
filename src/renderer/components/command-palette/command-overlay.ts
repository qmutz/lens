import type React from "react";
import { EventEmitter } from "../../utils";

export interface CommandDialogEvent {
  component?: React.ReactElement
}

export class CommandOverlay {
  private static commandDialogBus = new EventEmitter<[CommandDialogEvent]>();

  static open(component: React.ReactElement) {
    this.commandDialogBus.emit({ component });
  }

  static close() {
    this.commandDialogBus.emit({});
  }

  static on(listener: (event: CommandDialogEvent) => void) {
    this.commandDialogBus.addListener(listener);
  }
}
