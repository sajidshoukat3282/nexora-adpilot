const PBKDF2_ITERATIONS = 310_000;
const HASH_ALGORITHM = "SHA-256";
const SALT_BYTES = 16;
const HASH_BYTES = 32;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function derivePasswordKey(
  password: string,
  salt: Uint8Array,
): Promise<ArrayBuffer> {
  const saltBuffer = new Uint8Array(salt).buffer;
  const passwordBytes = new TextEncoder().encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    keyMaterial,
    HASH_BYTES * 8,
  );
}

export async function hashPassword(
  password: string,
): Promise<string> {
  if (password.length < 12) {
    throw new Error(
      "Password must contain at least 12 characters.",
    );
  }

  const salt = crypto.getRandomValues(
    new Uint8Array(SALT_BYTES),
  );

  const derivedKey = await derivePasswordKey(
    password,
    salt,
  );

  return [
    "pbkdf2",
    HASH_ALGORITHM,
    PBKDF2_ITERATIONS,
    bytesToBase64(salt),
    bytesToBase64(new Uint8Array(derivedKey)),
  ].join("$");
}

function constantTimeEqual(
  first: Uint8Array,
  second: Uint8Array,
): boolean {
  if (first.length !== second.length) return false;

  let difference = 0;

  for (let index = 0; index < first.length; index += 1) {
    difference |= first[index] ^ second[index];
  }

  return difference === 0;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parts = storedHash.split("$");

  if (
    parts.length !== 5 ||
    parts[0] !== "pbkdf2" ||
    parts[1] !== HASH_ALGORITHM
  ) {
    return false;
  }

  const iterations = Number(parts[2]);

  if (
    !Number.isInteger(iterations) ||
    iterations <= 0
  ) {
    return false;
  }

  try {
    const salt = base64ToBytes(parts[3]);
    const expected = base64ToBytes(parts[4]);

    const passwordBytes =
      new TextEncoder().encode(password);

    const keyMaterial =
      await crypto.subtle.importKey(
        "raw",
        passwordBytes,
        "PBKDF2",
        false,
        ["deriveBits"],
      );

    const actual = new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: new Uint8Array(salt).buffer,
          iterations,
          hash: HASH_ALGORITHM,
        },
        keyMaterial,
        expected.length * 8,
      ),
    );

    return constantTimeEqual(actual, expected);
  } catch {
    return false;
  }
}
