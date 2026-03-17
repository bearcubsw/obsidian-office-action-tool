import { findMatterRoot } from '../src/matterUtils';
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
    app.vault.folders.add('matter/02 Amendments and Remarks');
    const file = makeFile('matter/02 Amendments and Remarks/spec.md');
    app.workspace.setActiveFile(file);
    const result = await findMatterRoot(app as any);
    expect(result).toBe('matter');
  });

  test('finds root when AI Instructions.md is two levels up', async () => {
    const app = new MockApp();
    app.vault.files.set('matters/case1/AI Instructions.md', '# AI Instructions');
    app.vault.folders.add('matters/case1');
    const file = makeFile('matters/case1/02 Amendments and Remarks/03 Versions/snap/spec.md');
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
