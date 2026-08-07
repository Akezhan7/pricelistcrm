const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const serverDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(serverDir, '..');
const clientDir = path.join(rootDir, 'client');
const dryRun = process.argv.includes('--dry-run');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function formatCommand(command, args) {
  return [command, ...args].join(' ');
}

function run(command, args, cwd, options = {}) {
  console.log(`\n> ${formatCommand(command, args)}`);
  console.log(`  cwd: ${cwd}`);

  if (dryRun) return '';

  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  if (result.error) {
    throw new Error(`Cannot run ${command}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const details = options.capture ? (result.stderr || result.stdout || '').trim() : '';
    throw new Error(
      `${formatCommand(command, args)} failed with exit code ${result.status}${
        details ? `\n${details}` : ''
      }`
    );
  }

  return options.capture ? (result.stdout || '').trim() : '';
}

function assertCleanWorktree() {
  const status = run('git', ['status', '--porcelain', '--untracked-files=no'], rootDir, {
    capture: true,
  });

  if (status) {
    throw new Error(
      'Tracked files have local changes. Commit or restore them before deployment.\n' + status
    );
  }
}

async function deploy() {
  console.log(dryRun ? 'Deployment dry run' : 'Starting Plastkrep CRM deployment');

  if (!fs.existsSync(path.join(rootDir, '.git'))) {
    throw new Error(`Git repository not found at ${rootDir}`);
  }

  if (!dryRun) {
    run('git', ['--version'], rootDir);
    assertCleanWorktree();
  }

  const branch = dryRun
    ? 'main'
    : run('git', ['branch', '--show-current'], rootDir, { capture: true });

  if (!branch) {
    throw new Error('Deployment requires a checked-out Git branch');
  }

  run('git', ['pull', '--ff-only', 'origin', branch], rootDir);
  run(npmCommand, ['ci', '--omit=dev'], serverDir);
  run(npmCommand, ['ci', '--include=dev'], clientDir);
  run(npmCommand, ['run', 'build'], clientDir);
  run(npmCommand, ['run', 'db:migrate'], serverDir);
  console.log('\nUpdate completed. Starting the server in this PowerShell window.');
  run(npmCommand, ['start'], serverDir);
}

deploy().catch((error) => {
  console.error(`\nDeployment failed: ${error.message}`);
  console.error('The process was stopped. Fix the error above before retrying.');
  process.exit(1);
});
