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

const DEFAULT_EPOCH = BigInt(DISCORD_SNOWFLAKE_EPOCH);

function getEpoch(epoch?: number): bigint {
  return (epoch === undefined || epoch === null) ? DEFAULT_EPOCH : BigInt(epoch);
}


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
  const epoch = getEpoch(options.epoch);
  const processId = BigInt(options.processId ?? 0) & max.processId;
  const now = options.timestamp ?? Date.now();
  const elapsed = BigInt(now) - epoch;
  if (elapsed < 0n) {
    throw new RangeError(`Timestamp ${now} is before the epoch ${epoch}`);
  }
  const timestamp = elapsed % max.timestamp;
  const workerId = BigInt(options.workerId ?? 0) & max.workerId;

  let sequence: bigint;
  if (options.sequence === undefined || options.sequence === null) {
    sequence = cache.sequence = ++cache.sequence & max.sequence;
  } else {
    sequence = BigInt(options.sequence) & max.sequence;
  }

  const snowflake: Snowflake = {
    id: '',
    processId: Number(processId),
    sequence: Number(sequence),
    timestamp: Number(timestamp + epoch),
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
  const epoch = getEpoch(options.epoch);
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
  if (id) {
    const epoch = getEpoch(options.epoch);
    return Number((BigInt(id) >> shift.timestamp) + epoch);
  }
  return 0;
}
