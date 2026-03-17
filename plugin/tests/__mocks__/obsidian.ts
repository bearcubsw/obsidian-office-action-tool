// Minimal Obsidian API surface needed by this plugin's tests.
export class Notice {
  message: string;
  constructor(message: string, _timeout?: number) {
    this.message = message;
  }
}

export abstract class ItemView {
  containerEl: HTMLElement = document.createElement('div');
  app: any;
  leaf: any;
  constructor(leaf: any) { this.leaf = leaf; }
  abstract getViewType(): string;
  abstract getDisplayText(): string;
  onOpen(): Promise<void> { return Promise.resolve(); }
  onClose(): Promise<void> { return Promise.resolve(); }
  registerEvent(_event: any): void {}
}

export class Plugin {
  app: any;
  manifest: any;
  constructor(app: any, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }
  registerView(_type: string, _creator: any): void {}
  addCommand(_cmd: any): void {}
  addRibbonIcon(_icon: string, _title: string, _cb: any): any { return document.createElement('div'); }
  registerEvent(_event: any): void {}
}

export class WorkspaceLeaf {}
