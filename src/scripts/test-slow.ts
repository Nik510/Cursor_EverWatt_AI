import { spawnSync } from 'node:child_process';

process.env.EVERWATT_RUN_SLOW_TESTS = '1';

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['vitest', 'run', 'tests/**/*.slow.test.ts'];

const res = spawnSync(cmd, args, {
  stdio: 'inherit',
  env: process.env,
});

process.exit(typeof res.status === 'number' ? res.status : 1);

