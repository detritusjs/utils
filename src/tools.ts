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
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg) {
          const value = String(arg);
          args[i] = (value.includes(safeCharacter)) ? value.split(safeCharacter).map(encodeURIComponent).join(safeCharacter) : encodeURIComponent(value);
        }
      }
      return path(...args);
    });
  }
  return Object.freeze(safe);
}
