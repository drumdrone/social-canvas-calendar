// Shared localStorage keys for the login gate. One password now unlocks the
// app AND identifies the user (see SimpleAuthGate + AuthContext), so both
// values are written together on login and cleared together on logout.

const VERIFIED_KEY = 'simple_auth_verified';
const CURRENT_USER_ID_KEY = 'current_user_id';

export function getStoredUserId(): string | null {
  return localStorage.getItem(CURRENT_USER_ID_KEY);
}

export function isVerified(): boolean {
  return localStorage.getItem(VERIFIED_KEY) === 'true';
}

export function setLoggedInUser(userId: string): void {
  localStorage.setItem(VERIFIED_KEY, 'true');
  localStorage.setItem(CURRENT_USER_ID_KEY, userId);
}

export function clearLoggedInUser(): void {
  localStorage.removeItem(VERIFIED_KEY);
  localStorage.removeItem(CURRENT_USER_ID_KEY);
}
