import { Plugin, WorkspaceLeaf } from 'obsidian';
import { SidebarPanel, VIEW_TYPE } from './SidebarPanel';
import { LogService } from './LogService';
import { createStructure } from './createStructure';
import { createTasks } from './createTasks';
import { createBackup } from './createBackup';
import { trackChanges } from './trackChanges';
import { archiveTasks } from './archiveTasks';

export default class OfficeActionPlugin extends Plugin {
  private log!: LogService;

  async onload(): Promise<void> {
    this.log = new LogService();

    // Register the sidebar panel view
    this.registerView(VIEW_TYPE, (leaf: WorkspaceLeaf) =>
      new SidebarPanel(leaf, this.log)
    );

    // Activate the panel on startup
    this.app.workspace.onLayoutReady(() => this.activateView());

    // Register command palette commands
    this.addCommand({
      id: 'create-structure',
      name: 'Office Action: Create Structure',
      callback: () => createStructure(this.app, this.log),
    });

    this.addCommand({
      id: 'create-tasks',
      name: 'Office Action: Create Tasks',
      callback: () => createTasks(this.app, this.log),
    });

    this.addCommand({
      id: 'create-backup',
      name: 'Office Action: Create Backup',
      callback: () => createBackup(this.app, this.log),
    });

    this.addCommand({
      id: 'track-changes',
      name: 'Office Action: Track Changes',
      callback: () => trackChanges(this.app, this.log),
    });

    this.addCommand({
      id: 'archive-tasks',
      name: 'Office Action: Archive Tasks',
      callback: () => archiveTasks(this.app, this.log),
    });

    // Ribbon icon to open/focus the panel
    this.addRibbonIcon('briefcase', 'Office Action Tool', () => this.activateView());
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  private async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false) ?? workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }
}
