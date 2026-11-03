import { useSyncExternalStore } from "react";
import { apiRequest, setUnauthorizedHandler } from "./api";

/**
 * The signed-in user. The session itself is an HttpOnly cookie set by the
 * backend, so JavaScript never sees the token; this module only tracks who is
 * signed in, asking /api/auth/me once on first use. It is the only module that
 * talks to the auth API.
 */

export type Session = { email: string };

export type SessionState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; session: Session };

const LOADING: SessionState = { status: "loading" };
const ANONYMOUS: SessionState = { status: "anonymous" };

let state: SessionState = LOADING;
let checked = false;
const listeners = new Set<() => void>();

function setState(next: SessionState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function authenticated(session: Session) {
  setState({ status: "authenticated", session });
}

// Any 401 (e.g. an expired session) means the user is no longer signed in.
setUnauthorizedHandler(() => setState(ANONYMOUS));

async function checkSession() {
  try {
    authenticated(await apiRequest<Session>("/api/auth/me"));
  } catch {
    setState(ANONYMOUS);
  }
}

function authenticateWith(path: string) {
  return async (email: string, password: string): Promise<void> => {
    authenticated(await apiRequest<Session>(path, { method: "POST", body: { email, password } }));
  };
}

/** Throws an ApiError (e.g. "Incorrect email or password.") on failure. */
export const signIn = authenticateWith("/api/auth/signin");

/** Creates an account and signs in. Throws an ApiError on failure. */
export const signUp = authenticateWith("/api/auth/signup");

export async function signOut(): Promise<void> {
  try {
    await apiRequest("/api/auth/signout", { method: "POST" });
  } finally {
    // Signed out locally even if the request failed; the cookie expires anyway.
    setState(ANONYMOUS);
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!checked) {
    checked = true;
    void checkSession();
  }
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;
const getServerSnapshot = () => LOADING;

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** @internal Test helper: forget the cached session so the next subscriber checks again. */
export function resetSessionForTests() {
  state = LOADING;
  checked = false;
}
