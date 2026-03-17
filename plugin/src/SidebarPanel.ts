import { ItemView, WorkspaceLeaf, MarkdownView, setIcon } from 'obsidian';
import { LogService, LogLevel } from './LogService';
import { createStructure } from './createStructure';
import { createBackup } from './createBackup';
import { trackChanges } from './trackChanges';

export const VIEW_TYPE = 'office-action-tool';

export class SidebarPanel extends ItemView {
  private log: LogService;
  private logEl: HTMLElement | null = null;
  private notesEl: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, log: LogService) {
    super(leaf);
    this.log = log;
    this.log.onChange(() => this.renderLog());
  }

  getViewType(): string { return VIEW_TYPE; }
  getDisplayText(): string { return 'Office Action Tool'; }
  getIcon(): string { return 'briefcase'; }

  async onOpen(): Promise<void> {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass('oat-panel');

    // --- Tab bar ---
    const tabBar = root.createDiv({ cls: 'oat-tab-bar' });
    const tabContent = root.createDiv({ cls: 'oat-tab-content' });

    const tabs = ['Actions', 'Notes', 'Log'] as const;
    const panes: Record<string, HTMLElement> = {};

    tabs.forEach((name, i) => {
      const btn = tabBar.createEl('button', { text: name, cls: 'oat-tab-btn' });
      const pane = tabContent.createDiv({ cls: 'oat-pane' });
      panes[name] = pane;
      if (i > 0) pane.hide();

      btn.onclick = () => {
        tabBar.querySelectorAll('.oat-tab-btn').forEach(b => b.removeClass('oat-tab-active'));
        tabContent.querySelectorAll('.oat-pane').forEach(p => (p as HTMLElement).hide());
        btn.addClass('oat-tab-active');
        pane.show();
      };

      if (i === 0) btn.addClass('oat-tab-active');
    });

    this.buildActionsPane(panes['Actions']);
    this.buildNotesPane(panes['Notes']);
    this.buildLogPane(panes['Log']);
  }

  private buildActionsPane(pane: HTMLElement): void {
    const actions: { label: string; lucideIcon: string; tooltip: string; handler: () => Promise<void> }[] = [
      {
        label: 'Create Structure',
        lucideIcon: 'folder-plus',
        tooltip: 'Scaffold matter folder structure and AI Instructions',
        handler: async () => {
          const countBefore = this.log.entries.length;
          await createStructure(this.app, this.log);
          this.switchToLogOnError(countBefore);
        },
      },
      {
        label: 'Create Backup',
        lucideIcon: 'archive',
        tooltip: 'Copy current amendments to a timestamped version folder',
        handler: async () => {
          const countBefore = this.log.entries.length;
          await createBackup(this.app, this.log);
          this.switchToLogOnError(countBefore);
        },
      },
      {
        label: 'Track Changes',
        lucideIcon: 'git-compare',
        tooltip: 'Prime originals or generate USPTO-formatted track changes',
        handler: async () => {
          const countBefore = this.log.entries.length;
          await trackChanges(this.app, this.log);
          this.switchToLogOnError(countBefore);
        },
      },
    ];

    for (const action of actions) {
      const btn = pane.createEl('button', {
        cls: 'oat-action-btn',
        attr: { title: action.tooltip },
      });
      const iconEl = btn.createSpan({ cls: 'oat-btn-icon' });
      setIcon(iconEl, action.lucideIcon);
      btn.createSpan({ text: ' ' + action.label });
      btn.onclick = action.handler;
    }
  }

  private buildNotesPane(pane: HTMLElement): void {
    this.notesEl = pane.createDiv({ cls: 'oat-notes-list' });
    this.renderNotes();

    // Update when active file changes
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => this.renderNotes())
    );
    this.registerEvent(
      this.app.workspace.on('editor-change', () => this.renderNotes())
    );
  }

  private renderNotes(): void {
    if (!this.notesEl) return;
    this.notesEl.empty();

    const file = this.app.workspace.getActiveFile();
    if (!file) {
      this.notesEl.createEl('p', { text: 'No file open.', cls: 'oat-empty' });
      return;
    }

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const content = (view?.editor as any)?.getValue() ?? '';

    // Parse footnote definitions: [^label]: text
    const footnoteRe = /\[\^([^\]]+)\]:\s*(.+)/g;
    const footnotes: { label: string; text: string }[] = [];
    let match;
    while ((match = footnoteRe.exec(content)) !== null) {
      footnotes.push({ label: match[1], text: match[2] });
    }

    if (footnotes.length === 0) {
      this.notesEl.createEl('p', { text: 'No footnotes in current document.', cls: 'oat-empty' });
      return;
    }

    for (const fn of footnotes) {
      const item = this.notesEl.createDiv({ cls: 'oat-note-item' });
      item.createSpan({ text: `[^${fn.label}]`, cls: 'oat-note-label' });
      item.createSpan({ text: fn.text, cls: 'oat-note-text' });
      item.onclick = () => this.scrollToFootnote(fn.label);
    }
  }

  private scrollToFootnote(label: string): void {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!(view?.editor as any)) return;
    const editor = view!.editor as any;
    const content = editor.getValue();
    // Find first inline reference [^label] (not the definition)
    const inlineRe = new RegExp(`\\[\\^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\](?!:)`, '');
    const idx = content.search(inlineRe);
    if (idx < 0) return;
    const pos = editor.offsetToPos(idx);
    editor.setCursor(pos);
    editor.scrollIntoView({ from: pos, to: pos }, true);
  }

  private buildLogPane(pane: HTMLElement): void {
    this.logEl = pane.createDiv({ cls: 'oat-log-list' });
    this.renderLog();
  }

  private renderLog(): void {
    if (!this.logEl) return;
    this.logEl.empty();

    if (this.log.entries.length === 0) {
      this.logEl.createEl('p', { text: 'No activity yet.', cls: 'oat-empty' });
      return;
    }

    for (const entry of this.log.entries) {
      const item = this.logEl.createDiv({ cls: `oat-log-entry oat-log-${entry.level}` });
      item.createSpan({ text: `[${entry.timestamp}] `, cls: 'oat-log-ts' });
      item.createSpan({ text: entry.message });
    }

    // Auto-scroll to bottom
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  /** Switch to Log tab if any entry added since `countBefore` is an error. */
  private switchToLogOnError(countBefore: number): void {
    const newEntries = this.log.entries.slice(countBefore);
    if (newEntries.some(e => e.level === LogLevel.Error)) {
      const logBtn = this.containerEl.querySelector('.oat-tab-btn:last-child') as HTMLElement;
      logBtn?.click();
    }
  }

  async onClose(): Promise<void> {}
}
