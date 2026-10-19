import {cp, mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const marker = '.huddle-generated.json';
const identity = 'huddle-vega-source-v1';

function run(command, args, cwd) {
  const result = spawnSync(command, args, {cwd, stdio: 'inherit'});
  if (result.error) throw new Error(`The command ${command} failed: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`The command ${command} returned exit code ${result.status}.`);
}

function requireSDK(root) {
  const result = spawnSync('vega', ['--version'], {cwd: root, stdio: 'inherit'});
  if (result.error || result.status !== 0) {
    throw new Error('Huddle requires the Vega SDK. You can install Amazon’s SDK and run source ~/vega/env before retrying this command.');
  }
}

export async function syncSource(root = repository) {
  const target = join(root, 'Huddle-Vega');
  const metadata = JSON.parse(await readFile(join(target, marker), 'utf8'));
  if (metadata.format !== identity) throw new Error('Huddle refuses to replace an unmanaged native source directory.');
  const source = join(root, 'Huddle-RN-Web-Preview');
  await readFile(join(source, 'App.tsx'));
  await readdir(join(source, 'src'));
  const destination = join(target, 'src', 'huddle');
  await rm(destination, {recursive: true, force: true});
  await mkdir(destination, {recursive: true});
  await cp(join(source, 'App.tsx'), join(destination, 'App.tsx'));
  await cp(join(source, 'src'), join(destination, 'src'), {
    recursive: true,
    filter: path => !/\.web\.[^.]+$/.test(path),
  });
  console.log('Huddle copied the shared screens and Vega adapters into Huddle-Vega/src/huddle.');
}

export async function configureGeneratedProject(root = repository) {
  const target = join(root, 'Huddle-Vega');
  const packagePath = join(target, 'package.json');
  const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
  const app = JSON.parse(await readFile(join(target, 'app.json'), 'utf8'));
  if (!app.name) throw new Error('The generated app.json must identify the registered component.');
  await readFile(join(target, 'manifest.toml'));
  const entries = ['index.js', 'index.ts', 'index.tsx'].filter(name => existsSync(join(target, name)));
  if (entries.length !== 1) {
    throw new Error('The Vega template has an unfamiliar entry point. Huddle requires a review before replacing that entry point.');
  }
  const entry = entries[0];
  const original = await readFile(join(target, entry), 'utf8');
  await writeFile(join(target, `${entry}.template-backup`), original, {flag: 'wx'});
  await writeFile(join(target, entry), `import {AppRegistry} from 'react-native';
import {name as appName} from './app.json';
import App from './src/huddle/App';

AppRegistry.registerComponent(appName, () => App);
`);
  pkg.scripts = {
    ...pkg.scripts,
    'sync:huddle': 'node ../scripts/vega.mjs sync',
    'check:huddle': 'tsc --noEmit -p tsconfig.huddle.json',
    'build:huddle': 'npm run sync:huddle && npm run check:huddle && react-native build-vega --build-type Release',
  };
  await writeFile(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  await writeFile(join(target, 'tsconfig.huddle.json'), JSON.stringify({
    extends: './tsconfig.json',
    compilerOptions: {noEmit: true},
    include: ['src/huddle/**/*.ts', 'src/huddle/**/*.tsx'],
    exclude: ['node_modules'],
  }, null, 2) + '\n');
  await writeFile(join(target, marker), JSON.stringify({format: identity, entry}, null, 2) + '\n');
  await syncSource(root);
}

async function main() {
  const command = process.argv[2];
  const target = join(repository, 'Huddle-Vega');
  const architecture = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
  if (command === 'sync') {
    await syncSource();
  } else if (command === 'setup') {
    if (existsSync(target)) {
      throw new Error('Huddle-Vega already exists. You can use npm run vega:sync for an existing generated project.');
    }
    requireSDK(repository);
    run('vega', ['project', 'generate', '--template', 'helloWorld', '--name', 'huddle',
      '--packageId', 'com.aryban.huddle', '--outputDir', target], repository);
    await configureGeneratedProject();
    run('vega', ['project', 'update-manifest', '--os-min', '1.2', '--os-version', '1.2'], target);
    run('vega', ['project', 'install', '--fix'], target);
    console.log('Huddle prepared the native project. You can run npm install inside Huddle-Vega next.');
  } else if (command === 'build') {
    requireSDK(repository);
    if (!existsSync(join(target, marker))) {
      throw new Error('Huddle requires a generated project. You can run npm run vega:setup first.');
    }
    run('vega', ['project', 'doctor'], target);
    run('npm', ['run', 'build:huddle', '--', '--target', architecture], target);
  } else if (command === 'run') {
    requireSDK(repository);
    const packageFile = join(target, 'build', `${architecture}-release`, `huddle_${architecture}.vpkg`);
    if (!existsSync(packageFile)) {
      throw new Error('Huddle requires a built package. You can run npm run vega:build first.');
    }
    const app = JSON.parse(await readFile(join(target, 'app.json'), 'utf8'));
    const status = spawnSync('vega', ['virtual-device', 'status'], {cwd: target, encoding: 'utf8'});
    if (status.error || status.status !== 0) {
      throw new Error('Huddle could not read the simulator status. You can run vega virtual-device status to inspect the error.');
    }
    const stateLine = status.stdout.split(/\r?\n/).find(line => line.trim().startsWith('{'));
    if (!stateLine) throw new Error('The simulator returned an unfamiliar status response.');
    if (!JSON.parse(stateLine).running) run('vega', ['virtual-device', 'start'], target);
    run('vega', ['run-app', packageFile, app.name, '-d', 'VirtualDevice'], target);
  } else {
    throw new Error('Huddle expects one command: setup, sync, build, or run.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
