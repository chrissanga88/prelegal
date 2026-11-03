/** JSON requests to the backend's /api routes, with user-facing error messages. */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const GENERIC_ERROR = "Something went wrong. Please try again.";
const NETWORK_ERROR = "Couldn’t reach the server. Check your connection and try again.";

let onUnauthorized: () => void = () => {};

/** Called whenever the API answers 401, e.g. to sign the user out when their session expires. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

/**
 * FastAPI puts a user-facing string in `detail`; validation errors carry a list
 * whose messages look like "Value error, Use at least 8 characters.".
 */
function errorMessage(body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && typeof detail[0]?.msg === "string" && detail[0].msg.startsWith("Value error, ")) {
    return detail[0].msg.slice("Value error, ".length);
  }
  return GENERIC_ERROR;
}

/** Throws an ApiError whose message is safe to show to the user. Resolves undefined for 204. */
export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, NETWORK_ERROR);
  }

  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) onUnauthorized();
    throw new ApiError(response.status, errorMessage(body));
  }
  if (body === null) throw new ApiError(response.status, GENERIC_ERROR);
  return body as T;
}
