import { spawnSync } from 'node:child_process';

const url = process.env.TG_PRISMA_PUSH_URL || '';

if (!url) {
  console.error('TG_PRISMA_PUSH_URL is required.');
  process.exit(1);
}

if (!url.includes('schema=tg_bot')) {
  console.error('Refusing to run: TG_PRISMA_PUSH_URL must target a tg_bot-scoped schema (expected query param schema=tg_bot).');
  process.exit(1);
}

const cmd = './node_modules/.bin/prisma';
const args = ['db', 'push', '--schema', 'prisma/schema.push.prisma', '--skip-generate'];

const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);
