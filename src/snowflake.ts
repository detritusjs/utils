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

interface SequenceState {
  // the millisecond the current run of sequences started in, `timestamp` borrows past it when one runs out
  start: bigint,
  // the last generated millisecond (absolute, not relative to an epoch) and the sequence used in it
  sequence: bigint,
  timestamp: bigint,
}

// ids made from `Date.now()`, this one only ever moves forward
const clock: SequenceState = {start: -1n, sequence: 0n, timestamp: -1n};
// ids made from a passed in `timestamp`, kept apart so they can't rewind the clock's
const manual: SequenceState = {start: -1n, sequence: 0n, timestamp: -1n};

function nextSequence(state: SequenceState, now: bigint, isClock: boolean): [bigint, bigint] {
  if (now < state.timestamp && (isClock || state.start <= now)) {
    // the clock went backwards, or `now` is inside a run that borrowed ahead, keep counting from the last one
    now = state.timestamp;
  }
  let sequence = 0n;
  if (now === state.timestamp) {
    sequence = (state.sequence + 1n) & max.sequence;
    if (!sequence) {
      // every sequence in this millisecond is used, borrow the next one
      now++;
    }
  } else {
    state.start = now;
  }
  state.sequence = sequence;
  state.timestamp = now;
  return [now, sequence];
}

const DEFAULT_EPOCH = BigInt(DISCORD_SNOWFLAKE_EPOCH);
const MAX_ID = 1n << 64n;

function getEpoch(epoch?: number): bigint {
  return (epoch === undefined || epoch === null) ? DEFAULT_EPOCH : BigInt(epoch);
}

function parseId(id: string): bigint {
  const snowflake = BigInt(id);
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

/**
 * Ids made without `timestamp` and `sequence` are unique within this process (for the same `workerId` and `processId`), whatever other calls passed
 * An explicit `timestamp` before the clock's last used millisecond (or past the real clock) can collide with ids made in it
 * Out of range `workerId`s and `processId`s are masked to 5 bits
 */
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
    if (options.timestamp === undefined || options.timestamp === null) {
      [now, sequence] = nextSequence(clock, now, true);
    } else if (clock.start <= now && (now <= clock.timestamp || now <= BigInt(Date.now()))) {
      // a millisecond the clock already made ids in (or is about to), keep counting there so they can't collide
      // past the real clock stays apart, or every later id would be dated in the future
      [now, sequence] = nextSequence(clock, now, false);
    } else {
      [now, sequence] = nextSequence(manual, now, false);
    }
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
    // like `timestamp()`, an empty id is 0 instead of the epoch
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
