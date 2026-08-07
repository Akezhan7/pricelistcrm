const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawnSync } = require('child_process');

const serverDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(serverDir, '..');
const clientDir = path.join(rootDir, 'client');
const ecosystemPath = path.join(serverDir, 'ecosystem.config.js');
const dryRun = process.argv.includes('--dry-run');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const pm2Command = process.platform === 'win32' ? 'pm2.cmd' : 'pm2';

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

function readEnvValue(filePath, key) {
  if (!fs.existsSync(filePath)) return undefined;

  const line = fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${key}=`));

  if (!line) return undefined;
  return line
    .slice(line.indexOf('=') + 1)
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2');
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

function waitForHealth(port, attempts = 15) {
  if (dryRun) {
    console.log(`\n> health check http://127.0.0.1:${port}/health`);
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let attempt = 0;

    const retry = (error) => {
      if (attempt >= attempts) {
        reject(error);
        return;
      }
      setTimeout(check, 2000);
    };

    const check = () => {
      attempt += 1;
      const request = http.get(
        {
          hostname: '127.0.0.1',
          port,
          path: '/health',
          timeout: 3000,
        },
        (response) => {
          response.resume();
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            console.log(`\nHealth check passed: http://127.0.0.1:${port}/health`);
            resolve();
            return;
          }

          retry(new Error(`Health check returned HTTP ${response.statusCode}`));
        }
      );

      request.on('timeout', () => request.destroy(new Error('Health check timed out')));
      request.on('error', retry);
    };

    check();
  });
}

async function deploy() {
  console.log(dryRun ? 'Deployment dry run' : 'Starting Plastkrep CRM deployment');

  if (!fs.existsSync(path.join(rootDir, '.git'))) {
    throw new Error(`Git repository not found at ${rootDir}`);
  }

  if (!dryRun) {
    run('git', ['--version'], rootDir);
    run(pm2Command, ['--version'], serverDir);
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
  run(pm2Command, ['startOrReload', ecosystemPath, '--env', 'production'], serverDir);
  run(pm2Command, ['save'], serverDir);

  const port = Number(process.env.PORT || readEnvValue(path.join(serverDir, '.env'), 'PORT') || 5000);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid server port: ${port}`);
  }

  await waitForHealth(port);
  console.log('\nDeployment completed successfully.');
}

deploy().catch((error) => {
  console.error(`\nDeployment failed: ${error.message}`);
  console.error('The process was stopped. Check the error above and PM2 logs before retrying.');
  process.exit(1);
});
