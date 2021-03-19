/**
 * Get a boolean value from query params. This treats a key with no "=" or a
 * value of `""` to be `true`.
 * @param query The query params to parse from
 * @param key The key of the query argument
 */
export function getBoolean(query: URLSearchParams, key: string): boolean {
  const value = query.get(key);

  switch (value?.toLowerCase()) {
    case "false":
    case "f":
    case "0":
    case null:
    case undefined:
      return false;
    default:
      return true;
  }
}
