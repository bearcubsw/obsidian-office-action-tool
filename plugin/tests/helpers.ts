export interface MockFile {
  path: string;
  name: string;
  basename: string;
  extension: string;
  parent: MockFolder;
}

export interface MockFolder {
  path: string;
  name: string;
  children: (MockFile | MockFolder)[];
  parent: MockFolder | null;
}

export function makeFolder(path: string, parent: MockFolder | null = null): MockFolder {
  return {
    path,
    name: path.split('/').pop() ?? path,
    children: [],
    parent,
  };
}

export function makeFile(path: string): MockFile {
  const parts = path.split('/');
  const name = parts[parts.length - 1];
  const folderPath = parts.slice(0, -1).join('/');
  const dotIdx = name.lastIndexOf('.');
  return {
    path,
    name,
    basename: dotIdx >= 0 ? name.slice(0, dotIdx) : name,
    extension: dotIdx >= 0 ? name.slice(dotIdx + 1) : '',
    parent: makeFolder(folderPath),
  };
}

export class MockVault {
  folders: Set<string> = new Set();
  files: Map<string, string> = new Map();

  async createFolder(path: string): Promise<void> {
    this.folders.add(path);
  }

  async create(path: string, content: string): Promise<MockFile> {
    this.files.set(path, content);
    return makeFile(path);
  }

  async read(file: MockFile): Promise<string> {
    const content = this.files.get(file.path);
    if (content === undefined) throw new Error(`File not found: ${file.path}`);
    return content;
  }

  async modify(file: MockFile, content: string): Promise<void> {
    this.files.set(file.path, content);
  }

  async copy(file: MockFile, newPath: string): Promise<MockFile> {
    const content = this.files.get(file.path) ?? '';
    this.files.set(newPath, content);
    return makeFile(newPath);
  }

  getAbstractFileByPath(path: string): MockFile | MockFolder | null {
    if (this.files.has(path)) return makeFile(path);
    if (this.folders.has(path)) return makeFolder(path);
    return null;
  }

  getMarkdownFiles(): MockFile[] {
    return Array.from(this.files.keys())
      .filter(p => p.endsWith('.md'))
      .map(makeFile);
  }
}

export class MockWorkspace {
  private _activeFile: MockFile | null = null;

  setActiveFile(file: MockFile | null): void {
    this._activeFile = file;
  }

  getActiveFile(): MockFile | null {
    return this._activeFile;
  }

  on(_event: string, _cb: any): any { return {}; }
  off(_event: string, _ref: any): void {}
  getActiveViewOfType(_type: any): any { return null; }
  onLayoutReady(_cb: () => void): void {}
  getLeavesOfType(_type: string): any[] { return []; }
  getRightLeaf(_split: boolean): any { return { setViewState: async () => {} }; }
  getLeaf(_split: boolean): any { return { setViewState: async () => {} }; }
  revealLeaf(_leaf: any): void {}
  detachLeavesOfType(_type: string): void {}
}

export class MockApp {
  vault = new MockVault();
  workspace = new MockWorkspace();
}
