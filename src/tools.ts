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
  // bigint `%` keeps the sign, a negative id would give a negative shard
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
 * Parameters must accept strings, so a `number` or `bigint` one is a type error instead of `id + 1n` silently concatenating
 */
export type URIEncodeWrapSafe<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => any ? (...args: {[I in keyof A]: URIEncodedArgument<A[I]>}) => any : T[K];
};

// `encodeURIComponent` leaves `.` alone, so a `.` or `..` argument would climb out of the url
// `%2E` is a dot to the url parser too, so the percent itself is encoded
const DotSegmentRegex = /^\.{1,2}$/;

const safeCharacter = '@';
// generic so the wrapped route builders keep their signatures
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
          // a lone surrogate would make `encodeURIComponent` throw
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
