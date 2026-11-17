export function normalize(object: {[key: string]: any}) {
  for (const key in object) {
    object[key] = key;
  }
  return Object.freeze(object);
}

export function guildIdToShardId(guildId: string, shardCount: number = 0): number {
  // `BigInt()` throws on a fractional or `NaN` count
  if (!Number.isInteger(shardCount) || shardCount < 1) {
    return 0;
  }
  let id: bigint;
  try {
    id = BigInt(guildId);
  } catch(e) {
    return NaN;
  }
  // a negative id isn't a snowflake, and bigint `%` would keep the sign and give a negative shard
  if (id < 0n) {
    return NaN;
  }
  return Number((id >> 22n) % BigInt(shardCount));
}

export type URIEncodeWrapFunc = (...args: Array<any>) => string;
export type URIEncodeWrapped = {[key: string]: any};

/**
 * What a wrapped function actually gets for an argument: truthy ones are stringified and encoded, falsy ones pass through
 */
export type URIEncodedArgument<T> = string | Extract<T, '' | 0 | 0n | false | null | undefined>;

/**
 * Each function has to accept what it'll really be called with, so a parameter typed `number` or `bigint` (that would
 * get a string at runtime) is a type error instead of something like `id + 1n` silently concatenating
 */
export type URIEncodeWrapSafe<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => any ? (...args: {[I in keyof A]: URIEncodedArgument<A[I]>}) => any : T[K];
};

// `encodeURIComponent` leaves `.` alone, so a `.` or `..` argument would become a path segment that climbs out of the url
// `%2E` counts as a dot to the url parser too, so the percent itself is encoded (same as `detritus-rest` routes)
const DotSegmentRegex = /^\.{1,2}$/;

const safeCharacter = '@';
// generic so the wrapped route builders keep their types, the functions keep their signatures (only their arguments get encoded)
export function URIEncodeWrap<T extends URIEncodeWrapSafe<T>>(unsafe: T): Readonly<T> {
  const safe: URIEncodeWrapped = {};
  for (let key in unsafe) {
    const path = unsafe[key];
    if (typeof(path) !== 'function') {
      safe[key] = path;
      continue;
    }
    safe[key] = <URIEncodeWrapFunc> ((...args) => {
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg) {
          // a lone surrogate would make `encodeURIComponent` throw, they get replaced with U+FFFD instead
          const value = String(arg).toWellFormed();
          let encoded = (value.includes(safeCharacter)) ? value.split(safeCharacter).map(encodeURIComponent).join(safeCharacter) : encodeURIComponent(value);
          if (DotSegmentRegex.test(encoded)) {
            encoded = encoded.replace(/\./g, '%252E');
          }
          args[i] = encoded;
        }
      }
      return path(...args);
    });
  }
  return Object.freeze(safe) as Readonly<T>;
}
