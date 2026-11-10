const { ensureSchema } = require('../src/config/schemaSetup');
const { runSeedIfNeeded } = require('../src/config/seedRunner');
const db = require('../src/config/database');

async function main() {
  try {
    console.log('[INIT] Starting database initialization...');
    await ensureSchema();
    await runSeedIfNeeded();
    console.log('[INIT] Database initialization and seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[INIT ERROR]', err);
    process.exit(1);
  }
}

main();
