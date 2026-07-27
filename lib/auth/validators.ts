export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string) {
  return EMAIL_REGEX.test(email);
}

export function sanitizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}
