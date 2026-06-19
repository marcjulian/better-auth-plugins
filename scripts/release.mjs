#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { intro, select, confirm, outro, isCancel } from '@clack/prompts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function getPlugins() {
  const dir = join(root, 'packages');
  return readdirSync(dir).filter((name) => {
    const pkgPath = join(dir, name, 'package.json');
    return existsSync(pkgPath);
  });
}

function bumpVersion(version, type) {
  const parts = version.split('.').map(Number);
  switch (type) {
    case 'major':
      return `${parts[0] + 1}.0.0`;
    case 'minor':
      return `${parts[0]}.${parts[1] + 1}.0`;
    case 'patch':
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    default:
      throw new Error(`Unknown bump type: ${type}`);
  }
}

async function main() {
  intro('Plugin Release');

  const plugins = getPlugins();

  const plugin = await select({
    message: 'Which plugin?',
    options: plugins.map((name) => ({ label: name, value: name })),
  });
  if (isCancel(plugin)) process.exit(0);

  const bump = await select({
    message: 'Version bump?',
    options: [
      { label: 'patch', value: 'patch' },
      { label: 'minor', value: 'minor' },
      { label: 'major', value: 'major' },
    ],
  });
  if (isCancel(bump)) process.exit(0);

  const pkgPath = join(root, 'packages', plugin, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const oldVersion = pkg.version;
  const newVersion = bumpVersion(oldVersion, bump);

  const proceed = await confirm({
    message: `Bump ${plugin} from ${oldVersion} to ${newVersion}, commit & tag?`,
  });
  if (isCancel(proceed) || !proceed) {
    outro('Cancelled');
    process.exit(0);
  }

  pkg.version = newVersion;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  execSync('git add ' + JSON.stringify(pkgPath), { cwd: root });
  execSync('git commit -m ' + JSON.stringify(`${plugin}@${newVersion}`), {
    cwd: root,
  });
  execSync('git tag ' + JSON.stringify(`${plugin}-v${newVersion}`), {
    cwd: root,
  });

  outro(`Done! Pushed ${plugin}-v${newVersion}`);
}

main();
