export function normalize(object: {[key: string]: any}) {
  for (const key in object) {
    object[key] = key;
  }
  return Object.freeze(object);
}

export function guildIdToShardId(guildId: string, shardCount: number = 0): number {
  if (shardCount < 1) {
    return 0;
  }
  let id: bigint;
  try {
    id = BigInt(guildId);
  } catch(e) {
    return NaN;
  }
  return Number((id >> 22n) % BigInt(shardCount));
}

export type URIEncodeWrapFunc = (...args: Array<any>) => string;
export type URIEncodeWrapped = {[key: string]: any};

const safeCharacter = '@';
export function URIEncodeWrap(unsafe: URIEncodeWrapped): URIEncodeWrapped {
  const safe: URIEncodeWrapped = {};
  for (let key in unsafe) {
    const path = unsafe[key];
    if (typeof(path) !== 'function') {
      safe[key] = path;
      continue;
    }
    safe[key] = <URIEncodeWrapFunc> ((...args) => {
      args = args.map((arg) => {
        if (!arg) {
          return arg;
        }
        const value = String(arg);
        if (!value.includes(safeCharacter)) {
          return encodeURIComponent(value);
        }
        return value.split('').map((char) => {
          return (char === safeCharacter) ? char : encodeURIComponent(char);
        }).join('');
      });
      return path(...args);
    });
  }
  return Object.freeze(safe);
}
