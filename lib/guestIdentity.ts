export type GuestIdentity = { guestId: string; displayName: string };

function storageKey(guestSlug: string) {
  return `hm_guest_${guestSlug}`;
}

export function loadGuestIdentity(guestSlug: string): GuestIdentity | null {
  try {
    const raw = localStorage.getItem(storageKey(guestSlug));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveGuestIdentity(guestSlug: string, identity: GuestIdentity) {
  localStorage.setItem(storageKey(guestSlug), JSON.stringify(identity));
}

export function clearGuestIdentity(guestSlug: string) {
  localStorage.removeItem(storageKey(guestSlug));
}
