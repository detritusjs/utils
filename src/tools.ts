export function normalize(object: {[key: string]: any}) {
  for (const key in object) {
    object[key] = key;
  }
  return Object.freeze(object);
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
