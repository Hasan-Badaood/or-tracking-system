const ENABLED = import.meta.env.VITE_ENCRYPT_RESPONSES === 'true';
const KEY_HEX = import.meta.env.VITE_API_ENCRYPTION_KEY as string | undefined;

let cachedKey: CryptoKey | null = null;

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const buf = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  if (!KEY_HEX) throw new Error('VITE_API_ENCRYPTION_KEY is not set');
  const keyBytes = hexToBytes(KEY_HEX);
  cachedKey = await window.crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  return cachedKey;
}

export function isEncryptedPayload(data: unknown): data is { iv: string; data: string; tag: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'iv' in data &&
    'data' in data &&
    'tag' in data
  );
}

export async function decryptPayload(payload: { iv: string; data: string; tag: string }): Promise<unknown> {
  const key = await getKey();
  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.data);
  const tag = base64ToBytes(payload.tag);

  // Web Crypto API expects ciphertext + auth tag concatenated
  const combinedBuf = new ArrayBuffer(ciphertext.length + tag.length);
  const combined = new Uint8Array(combinedBuf);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    combined
  );

  return JSON.parse(new TextDecoder().decode(decrypted));
}

export { ENABLED as encryptionEnabled };
