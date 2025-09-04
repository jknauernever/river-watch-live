// Encryption utilities for OAuth tokens
// Uses AES-GCM encryption with a 256-bit key

const ENCRYPTION_KEY = Deno.env.get("TOKEN_ENCRYPTION_KEY");

if (!ENCRYPTION_KEY) {
  throw new Error("TOKEN_ENCRYPTION_KEY environment variable is required");
}

// Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Convert Uint8Array to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Encrypt a token using AES-GCM
export async function encryptToken(token: string): Promise<string> {
  if (!ENCRYPTION_KEY) {
    throw new Error("Encryption key not configured");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    hexToBytes(ENCRYPTION_KEY),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedToken = new TextEncoder().encode(token);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedToken
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return bytesToHex(combined);
}

// Decrypt a token using AES-GCM
export async function decryptToken(encryptedToken: string): Promise<string> {
  if (!ENCRYPTION_KEY) {
    throw new Error("Encryption key not configured");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    hexToBytes(ENCRYPTION_KEY),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const combined = hexToBytes(encryptedToken);
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}
