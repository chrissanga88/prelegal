import { useSyncExternalStore } from "react";

/**
 * Client-side session for the V1 fake login. There is no real authentication:
 * any non-empty email and password "signs in". This module is the only place
 * that touches session storage, so real auth can later replace its internals
 * without changing the components that use it.
 */

const STORAGE_KEY = "prelegal.session";

export type Session = { email: string };

export type SessionState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; session: Session };

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "email" in value &&
      typeof value.email === "string" &&
      value.email.trim() !== ""
    ) {
      return { email: value.email };
    }
  } catch {
    // Corrupt storage is treated as signed out.
  }
  return null;
}

export function readSession(): Session | null {
  return parseSession(localStorage.getItem(STORAGE_KEY));
}

/** Signs in with any non-empty email and password. The password is never stored. */
export function signIn(email: string, password: string): Session | null {
  const trimmedEmail = email.trim();
  if (trimmedEmail === "" || password.trim() === "") return null;
  const session: Session = { email: trimmedEmail };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  emitChange();
  return session;
}

export function signOut(): void {
  localStorage.removeItem(STORAGE_KEY);
  emitChange();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep other tabs in sync, e.g. signing out everywhere at once.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// The raw string is the snapshot because it is referentially stable between reads.
const getSnapshot = () => localStorage.getItem(STORAGE_KEY);
// Storage is unavailable while prerendering, so report "loading" until hydrated.
const getServerSnapshot = () => undefined;

export function useSession(): SessionState {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (raw === undefined) return { status: "loading" };
  const session = parseSession(raw);
  return session ? { status: "authenticated", session } : { status: "anonymous" };
}
