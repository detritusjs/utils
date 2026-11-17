// package.json is in every published package and sits one folder up from both src/ and lib/, `require` keeps tsc
// from pulling it into the build (it's outside rootDir)
const { version } = require('../package.json') as {version: string};

export const Package = Object.freeze({
  URL: 'https://github.com/detritusjs/utils',
  VERSION: version,
});

export const DISCORD_SNOWFLAKE_EPOCH = 1420070400000;
export const DISCORD_TOKEN_EPOCH = 1293840000000;
