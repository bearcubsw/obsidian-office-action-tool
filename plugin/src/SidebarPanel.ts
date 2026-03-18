import { ItemView, WorkspaceLeaf, MarkdownView, setIcon } from 'obsidian';
import { LogService, LogLevel } from './LogService';
import { createStructure } from './createStructure';
import { createBackup } from './createBackup';
import { trackChanges } from './trackChanges';
import { archiveTasks } from './archiveTasks';

export const VIEW_TYPE = 'office-action-tool';

export class SidebarPanel extends ItemView {
  private log: LogService;
  private logEl: HTMLElement | null = null;
  private notesEl: HTMLElement | null = null;
  private outlineEl: HTMLElement | null = null;
  /** Last MarkdownView that held focus — never cleared by sidebar clicks. */
  private lastMdView: MarkdownView | null = null;

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

    const tabBar = root.createDiv({ cls: 'oat-tab-bar' });
    const tabContent = root.createDiv({ cls: 'oat-tab-content' });

    const tabs = ['Actions', 'Outline', 'Notes', 'Log'] as const;
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
    this.buildOutlinePane(panes['Outline']);
    this.buildNotesPane(panes['Notes']);
    this.buildLogPane(panes['Log']);

    // Only update when a MarkdownView is actually active.
    // When the sidebar itself takes focus, active-leaf-change fires with no
    // MarkdownView — we skip re-render so the outline/notes stay visible.
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
      const mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (mdView) {
        this.lastMdView = mdView;
        this.renderOutline();
        this.renderNotes();
      }
    }));
    this.registerEvent(this.app.workspace.on('editor-change', () => {
      const mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (mdView) this.lastMdView = mdView;
      this.renderOutline();
      this.renderNotes();
    }));
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
      {
        label: 'Archive Tasks',
        lucideIcon: 'check-check',
        tooltip: 'Move completed tasks ( - [x] ) from AI Tasks and User Tasks into Tasks Change Log',
        handler: async () => {
          const countBefore = this.log.entries.length;
          await archiveTasks(this.app, this.log);
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

  // ── Outline ────────────────────────────────────────────────────────────────

  private buildOutlinePane(pane: HTMLElement): void {
    this.outlineEl = pane.createDiv({ cls: 'oat-outline-list' });
    this.renderOutline();
  }

  private renderOutline(): void {
    if (!this.outlineEl) return;
    this.outlineEl.empty();

    const view = this.lastMdView;
    const content = (view?.editor as any)?.getValue() ?? '';

    if (!content) {
      this.outlineEl.createEl('p', { text: 'No file open.', cls: 'oat-empty' });
      return;
    }

    const headingRe = /^(#{1,6})\s+(.+)/gm;
    const headings: { level: number; text: string; offset: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = headingRe.exec(content)) !== null) {
      headings.push({ level: m[1].length, text: m[2].trim(), offset: m.index });
    }

    if (headings.length === 0) {
      this.outlineEl.createEl('p', { text: 'No headings in current document.', cls: 'oat-empty' });
      return;
    }

    for (const h of headings) {
      const item = this.outlineEl.createDiv({ cls: `oat-outline-item oat-outline-h${h.level}` });
      item.createSpan({ text: h.text });
      item.onclick = () => this.scrollToOffset(h.offset);
    }
  }

  // ── Notes ──────────────────────────────────────────────────────────────────

  private buildNotesPane(pane: HTMLElement): void {
    this.notesEl = pane.createDiv({ cls: 'oat-notes-list' });
    this.renderNotes();
  }

  private renderNotes(): void {
    if (!this.notesEl) return;
    this.notesEl.empty();

    const view = this.lastMdView;
    if (!view?.file) {
      this.notesEl.createEl('p', { text: 'No file open.', cls: 'oat-empty' });
      return;
    }

    const content = (view.editor as any)?.getValue() ?? '';

    const footnoteRe = /\[\^([^\]]+)\]:\s*(.+)/g;
    const footnotes: { label: string; text: string; offset: number }[] = [];
    let match: RegExpExecArray | null;
    while ((match = footnoteRe.exec(content)) !== null) {
      footnotes.push({ label: match[1], text: match[2], offset: match.index });
    }

    if (footnotes.length === 0) {
      this.notesEl.createEl('p', { text: 'No footnotes in current document.', cls: 'oat-empty' });
      return;
    }

    for (const fn of footnotes) {
      const item = this.notesEl.createDiv({ cls: 'oat-note-item' });
      item.createSpan({ text: `[^${fn.label}]`, cls: 'oat-note-label' });
      item.createSpan({ text: fn.text, cls: 'oat-note-text' });
      item.onclick = () => this.scrollToInlineRef(fn.label);
    }
  }

  private scrollToInlineRef(label: string): void {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return;
    const editor = view.editor as any;
    if (!editor) return;
    const content = editor.getValue() as string;
    // Match inline reference [^label] but NOT the definition [^label]:
    const inlineRe = new RegExp(`\\[\\^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\](?!:)`);
    const idx = content.search(inlineRe);
    if (idx < 0) return;
    this.scrollToOffset(idx);
  }

  // ── Shared navigation ──────────────────────────────────────────────────────

  /** Focus the editor leaf then scroll to the given character offset. */
  private scrollToOffset(offset: number): void {
    const view = this.lastMdView;
    if (!view) return;
    const editor = view.editor as any;
    if (!editor) return;
    (this.app.workspace as any).setActiveLeaf(view.leaf, { focus: true });
    const pos = editor.offsetToPos(offset);
    editor.setCursor(pos);
    editor.scrollIntoView({ from: pos, to: pos }, true);
  }

  // ── Log ────────────────────────────────────────────────────────────────────

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
