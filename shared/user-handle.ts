const HANDLE_PATTERN = /^[a-zA-Z0-9._+-]+$/;

/** Derive a non-editable profile handle from an email local-part. */
export function handleFromEmail(email: string | null | undefined): string | null {
  if (!email) {
    return null;
  }

  const at = email.indexOf("@");
  if (at <= 0) {
    return null;
  }

  const handle = email.slice(0, at).trim();
  if (!handle || !HANDLE_PATTERN.test(handle)) {
    return null;
  }

  return handle;
}

/** Profile URL path for a handle (`/u/alice.bob`). */
export function profilePathForHandle(handle: string): string {
  return `/u/${handle}`;
}

export function profilePathForEmail(email: string | null | undefined): string | null {
  const handle = handleFromEmail(email);
  return handle ? profilePathForHandle(handle) : null;
}

export function isValidHandle(handle: string): boolean {
  return HANDLE_PATTERN.test(handle) && handle.length > 0 && handle.length <= 64;
}
