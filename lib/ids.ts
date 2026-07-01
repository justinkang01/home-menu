import { customAlphabet } from "nanoid";

const slugAlphabet = "23456789abcdefghjkmnpqrstuvwxyz"; // no 0/O/1/l/i to avoid ambiguity
const nanoSlug = customAlphabet(slugAlphabet, 8);

export function generateAdminToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export function generateGuestSlug(): string {
  return nanoSlug();
}
