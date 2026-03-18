import { findMatterRoot, matterPaths } from '../src/matterUtils';
import { MockApp, makeFile } from './helpers';

describe('findMatterRoot', () => {
  test('returns null when no active file', async () => {
    const app = new MockApp();
    app.workspace.setActiveFile(null);
    const result = await findMatterRoot(app as any);
    expect(result).toBeNull();
  });

  test('finds root when AI Instructions.md is in the active file\'s own folder (step 0)', async () => {
    const app = new MockApp();
    app.vault.files.set('matter/AI Instructions.md', '# AI Instructions');
    app.vault.folders.add('matter');
    const file = makeFile('matter/AI Instructions.md');
    app.workspace.setActiveFile(file);
    const result = await findMatterRoot(app as any);
    expect(result).toBe('matter');
  });

  test('finds root when AI Instructions.md is one level up', async () => {
    const app = new MockApp();
    app.vault.files.set('matter/AI Instructions.md', '# AI Instructions');
    app.vault.folders.add('matter');
    app.vault.folders.add('matter/06 Amendments');
    const file = makeFile('matter/06 Amendments/spec.md');
    app.workspace.setActiveFile(file);
    const result = await findMatterRoot(app as any);
    expect(result).toBe('matter');
  });

  test('finds root when AI Instructions.md is two levels up', async () => {
    const app = new MockApp();
    app.vault.files.set('matters/case1/AI Instructions.md', '# AI Instructions');
    app.vault.folders.add('matters/case1');
    const file = makeFile('matters/case1/06 Amendments/01 Versions/snap/spec.md');
    app.workspace.setActiveFile(file);
    const result = await findMatterRoot(app as any);
    expect(result).toBe('matters/case1');
  });

  test('returns null when no AI Instructions.md found within 6 levels', async () => {
    const app = new MockApp();
    const file = makeFile('a/b/c/d/e/f/g/file.md');
    app.workspace.setActiveFile(file);
    const result = await findMatterRoot(app as any);
    expect(result).toBeNull();
  });

  test('does not walk more than 6 levels', async () => {
    const app = new MockApp();
    // Place AI Instructions.md 7 levels up — should NOT be found
    app.vault.files.set('root/AI Instructions.md', '# AI Instructions');
    const file = makeFile('root/a/b/c/d/e/f/g/file.md');
    app.workspace.setActiveFile(file);
    const result = await findMatterRoot(app as any);
    expect(result).toBeNull();
  });
});

describe('matterPaths', () => {
  test('returns correct v2 paths', () => {
    const paths = matterPaths('matter');
    expect(paths.tasks).toBe('matter/01 Tasks');
    expect(paths.usptoRecords).toBe('matter/02 USPTO Records');
    expect(paths.strategy).toBe('matter/03 Strategy');
    expect(paths.meetings).toBe('matter/04 Meetings');
    expect(paths.priorArt).toBe('matter/05 Prior Art');
    expect(paths.amendments).toBe('matter/06 Amendments');
    expect(paths.versions).toBe('matter/06 Amendments/01 Versions');
    expect(paths.usptoOutput).toBe('matter/06 Amendments/02 USPTO Output');
    expect(paths.remarks).toBe('matter/07 Remarks');
  });

  test('handles empty root', () => {
    const paths = matterPaths('');
    expect(paths.tasks).toBe('01 Tasks');
    expect(paths.amendments).toBe('06 Amendments');
  });

  test('does not include legacy v1 paths', () => {
    const paths = matterPaths('matter') as any;
    expect(paths.priorFilings).toBeUndefined();
    expect(paths.originals).toBeUndefined();
    expect(paths.usptoMarkup).toBeUndefined();
  });
});
