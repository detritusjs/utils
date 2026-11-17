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

// the last generated millisecond (absolute, not relative to an epoch) and the sequence used in it
const cache = {
  sequence: 0n,
  timestamp: -1n,
};

const DEFAULT_EPOCH = BigInt(DISCORD_SNOWFLAKE_EPOCH);
const MAX_ID = 1n << 64n;

function getEpoch(epoch?: number): bigint {
  return (epoch === undefined || epoch === null) ? DEFAULT_EPOCH : BigInt(epoch);
}

function parseId(id: string): bigint {
  const snowflake = BigInt(id);
  // snowflakes are unsigned 64 bit, anything outside of that would decode into garbage
  if (snowflake < 0n || MAX_ID <= snowflake) {
    throw new RangeError(`Snowflake ${id} is not an unsigned 64 bit integer`);
  }
  return snowflake;
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
  let now = BigInt(options.timestamp ?? Date.now());
  if (now < epoch) {
    throw new RangeError(`Timestamp ${now} is before the epoch ${epoch}`);
  }
  const workerId = BigInt(options.workerId ?? 0) & max.workerId;

  let sequence: bigint;
  if (options.sequence === undefined || options.sequence === null) {
    // the sequence only counts within one millisecond, so ids stay unique until 4096 are made in the same one
    if ((options.timestamp === undefined || options.timestamp === null) && now < cache.timestamp) {
      // the clock went backwards (or the last millisecond ran out of sequences), keep counting from the last one
      now = cache.timestamp;
    }
    if (now === cache.timestamp) {
      sequence = (cache.sequence + 1n) & max.sequence;
      if (!sequence) {
        // every sequence in this millisecond is used, borrow the next one
        now++;
      }
    } else {
      sequence = 0n;
    }
    cache.sequence = sequence;
    cache.timestamp = now;
  } else {
    sequence = BigInt(options.sequence) & max.sequence;
  }

  const timestamp = (now - epoch) % max.timestamp;

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
  if (!id) {
    // same as `timestamp()`, an empty id has no timestamp instead of the epoch
    return {id, processId: 0, sequence: 0, timestamp: 0, workerId: 0};
  }
  const epoch = getEpoch(options.epoch);
  const snowflake = parseId(id);
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
    return Number((parseId(id) >> shift.timestamp) + epoch);
  }
  return 0;
}
