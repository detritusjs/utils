import { DISCORD_SNOWFLAKE_EPOCH } from './constants';


const bits = Object.freeze({
  timestamp: 42n,
  workerId: 5n,
  processId: 5n,
  sequence: 12n,
});

const shift = Object.freeze({
  timestamp: bits.processId + bits.workerId + bits.sequence,
  workerId: bits.workerId + bits.sequence,
  processId: bits.sequence,
  sequence: 0n,
});

const max = Object.freeze({
  timestamp: 0x40000000000n,
  processId: -1n ^ (-1n << bits.processId),
  sequence: -1n ^ (-1n << bits.sequence),
  workerId: -1n ^ (-1n << bits.workerId),
});

const cache = {
  sequence: 0n,
};


export interface Snowflake {
  id: string,
  processId: number,
  sequence: number,
  timestamp: number,
  workerId: number,
}

export interface SnowflakeGenerateOptions {
  epoch?: number,
  processId?: number,
  sequence?: number,
  timestamp?: number,
  workerId?: number,
}

export function generate(
  options: SnowflakeGenerateOptions = {},
): Snowflake {
  options = Object.assign({
    epoch: DISCORD_SNOWFLAKE_EPOCH,
    processId: 0,
    timestamp: Date.now(),
    workerId: 0,
  }, options);

  const epoch = BigInt(options.epoch as number);
  const processId = BigInt(options.processId as number) & max.processId;
  const timestamp = (BigInt(options.timestamp as number) - epoch) % max.timestamp;
  const workerId = BigInt(options.workerId as number) & max.workerId;

  let sequence: bigint;
  if (options.sequence === undefined) {
    sequence = cache.sequence = ++cache.sequence & max.sequence;
  } else {
    sequence = BigInt(options.sequence) & max.sequence;
  }

  const snowflake: Snowflake = {
    id: '',
    processId: Number(processId),
    sequence: Number(sequence),
    timestamp: Number(timestamp),
    workerId: Number(workerId),
  };

  snowflake.id = String(
    (timestamp << shift.timestamp) |
    (workerId << shift.workerId) |
    (processId << shift.processId) |
    (sequence << shift.sequence)
  );

  return snowflake;
}


export interface SnowflakeDeconstructOptions {
  epoch?: number,
}

export function deconstruct(
  id: string,
  options: SnowflakeDeconstructOptions = {},
): Snowflake {
  options = Object.assign({
    epoch: DISCORD_SNOWFLAKE_EPOCH,
  }, options);

  const epoch = BigInt(options.epoch as number);
  const snowflake = BigInt(id);
  return {
    id,
    processId: Number((snowflake & 0x1F000n) >> shift.processId),
    sequence: Number(snowflake & 0xFFFn),
    timestamp: Number((snowflake >> shift.timestamp) + epoch),
    workerId: Number((snowflake & 0x3E0000n) >> shift.workerId),
  };
}


export function timestamp(
  id: string,
  options: SnowflakeDeconstructOptions = {},
): number {
  options = Object.assign({
    epoch: DISCORD_SNOWFLAKE_EPOCH,
  }, options);

  const epoch = BigInt(options.epoch as number);
  if (id) {
    return Number((BigInt(id) >> shift.timestamp) + epoch);
  }
  return 0;
}
