// `require` so tsc doesn't pull it (outside rootDir) into the build
const { version } = require('../package.json') as {version: string};

export const Package = Object.freeze({
  URL: 'https://github.com/detritusjs/utils',
  VERSION: version,
});

export const DISCORD_SNOWFLAKE_EPOCH = 1420070400000;
export const DISCORD_TOKEN_EPOCH = 1293840000000;
