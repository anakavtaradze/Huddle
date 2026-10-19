import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp, mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {configureGeneratedProject, syncSource} from '../scripts/vega.mjs';

test('The Vega integration preserves SDK metadata and excludes browser code.', async () => {
  const root = await mkdtemp(join(tmpdir(), 'huddle-vega-test-'));
  try {
    const target = join(root, 'Huddle-Vega');
    const source = join(root, 'Huddle-RN-Web-Preview');
    await mkdir(target);
    await mkdir(join(source, 'src/platform'), {recursive: true});
    await writeFile(join(target, 'app.json'), '{"name":"sdk-component"}');
    await writeFile(join(target, 'package.json'), JSON.stringify({dependencies: {'sdk-dependency': '1.2.3'}, scripts: {start: 'sdk-start'}}));
    await writeFile(join(target, 'manifest.toml'), 'schema-version = 1\n');
    await writeFile(join(target, 'index.js'), '// The SDK supplies this entry.\n');
    await writeFile(join(source, 'App.tsx'), 'export default function App() { return null; }');
    await writeFile(join(source, 'src/platform/tv.tsx'), '// Vega uses this adapter.');
    await writeFile(join(source, 'src/platform/tv.web.tsx'), '// The browser uses this adapter.');
    await configureGeneratedProject(root);
    const pkg = JSON.parse(await readFile(join(target, 'package.json')));
    assert.equal(pkg.dependencies['sdk-dependency'], '1.2.3');
    assert.equal(pkg.scripts.start, 'sdk-start');
    assert.match(await readFile(join(target, 'index.js'), 'utf8'), /name as appName/);
    assert.equal(await readFile(join(target, 'manifest.toml'), 'utf8'), 'schema-version = 1\n');
    assert.ok(existsSync(join(target, 'src/huddle/src/platform/tv.tsx')));
    assert.ok(!existsSync(join(target, 'src/huddle/src/platform/tv.web.tsx')));
    await writeFile(join(target, 'src/huddle/obsolete.ts'), 'old');
    await syncSource(root);
    assert.ok(!existsSync(join(target, 'src/huddle/obsolete.ts')));
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('The source sync refuses an unmanaged native directory.', async () => {
  const root = await mkdtemp(join(tmpdir(), 'huddle-vega-test-'));
  try {
    await mkdir(join(root, 'Huddle-Vega/src/huddle'), {recursive: true});
    const existing = join(root, 'Huddle-Vega/src/huddle/keep.ts');
    await writeFile(existing, 'existing user code');
    await assert.rejects(syncSource(root));
    assert.equal(await readFile(existing, 'utf8'), 'existing user code');
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});
