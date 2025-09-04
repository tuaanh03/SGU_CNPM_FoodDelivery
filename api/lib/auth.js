// Simple password hashing utility functions
// In production, use proper libraries like bcrypt

export async function hashPassword(password) {
  // Simple hash function for demo purposes
  // In production, use bcrypt or similar
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "salt_key_demo");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(password, hash) {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}

export function generateToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
