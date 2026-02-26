/**
 * Derive a 32-byte topic buffer from taskId + secret using SHA-256.
 * Format: "agentmart:<taskId>:<secret>"
 */
export async function deriveTopic(taskId: string, secret: string): Promise<Uint8Array> {
  const input = `agentmart:${taskId}:${secret}`;
  const encoded = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return new Uint8Array(hash);
}

/** Convert a Uint8Array to hex string */
export function toHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Derive a default secret from taskId + buyerUserId.
 * Returns first 16 hex chars of SHA-256(taskId + buyerUserId).
 */
export async function deriveSecret(taskId: string, buyerUserId: string): Promise<string> {
  const input = `${taskId}${buyerUserId}`;
  const encoded = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 16);
}
