// Fixture: non-exported interface (isExported must be false).
interface InternalHelper {
  token: string;
}

export function greet(h: InternalHelper): string {
  return h.token;
}
