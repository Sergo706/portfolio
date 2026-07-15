---
title: Key Concepts in crypto
description: Key Concepts in nodejs crypto
date: 2026-07-15
image: /knowledge-base/nodejs-crypto.png
readingTime: 15
contentType: guide
category: backend
tags:
 - Node.js
 - Crypto
 - Security
 - Cryptography
---

## 1. Key Concepts in `crypto`

### KeyObject

Internally, Node represents public keys, private keys, and symmetric keys as `KeyObject` instances.

* A `KeyObject` wraps the raw key material in a safe, memory-managed way (it’s not just a plain `Buffer`).
* You obtain a `KeyObject` by:

  * Generating a new pair (e.g. `generateKeyPair`/`generateKeyPairSync`),
  * Importing existing PEM/DER/JWK data (via `createPrivateKey` / `createPublicKey`),
  * Exporting to PEM/DER/JWK (via `keyObject.export()`).

### Signing & Verification

* **Signing**: You prove “I (holder of the private key) authorize or attest to this exact message.”
* **Verification**: Anyone with the matching public key can check that signature→message mapping.

In Node, you use `crypto.createSign(algorithm)` to build a “Sign” instance, feed it data, then

```js
const signature = sign.sign(privateKey);
```

which returns a `Buffer`.

To verify, you use `crypto.createVerify(algorithm)`, feed it the same data, then:

```js
const isValid = verify.verify(publicKey, signature); // boolean
```

### Asymmetric vs Symmetric

* **Asymmetric algorithms** (RSA, ECDSA, Ed25519, etc.) rely on a private/public key pair. The private key signs, the public key verifies.
* **Symmetric algorithms** (e.g. HMAC) use a shared secret key on both ends; Node handles HMAC via `crypto.createHmac()` and that key is just a `Buffer` or `KeyObject` too.

---

## 2. Creating or Importing Keys

### 2.1 Generating a New Key Pair

If you need to generate a fresh RSA or EC key pair for signing/verification:

```js
import { generateKeyPairSync } from 'crypto';

// Example: Generate an RSA key pair for signing (2048-bit, PKCS#1-style)
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'pkcs1',            // “pkcs1” or “spki” for public
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs1',            // “pkcs1” or “pkcs8” for private
    format: 'pem',
    cipher: 'aes-256-cbc',    // (optional) encrypt the PEM with a passphrase
    passphrase: 'your-strong-passphrase'
  }
});

// `publicKey` and `privateKey` here are PEM-encoded strings.
// If you need KeyObject instances, you can immediately turn them into KeyObjects:
import { createPrivateKey, createPublicKey } from 'crypto';
const privKeyObject = createPrivateKey({
  key: privateKey,
  format: 'pem',
  passphrase: 'your-strong-passphrase'
});
const pubKeyObject = createPublicKey(publicKey);
```

**Best practice:**

* Use at least 2048-bit RSA or a 256-bit curve (e.g. `rsa`, `ec` with `namedCurve: 'secp256k1'` or `'prime256v1'`).
* Protect your private key PEM with a strong passphrase if writing it to disk.
* Use `generateKeyPairSync()` only at startup or in build scripts—avoid calling it in a hot request/response path, since key generation can be CPU-intensive.

### 2.2 Importing an Existing Key (PEM/DER/JWK)

Often you already have a PEM‐formatted key on disk (or in an environment variable). To use it in Node, wrap it in a `KeyObject` via:

```js
import { createPrivateKey, createPublicKey } from 'crypto';

// 1. From a PEM string (e.g. loaded from process.env or fs.readFileSync):
const privPem = `-----BEGIN ENCRYPTED PRIVATE KEY-----
MIIE6TAb... (base64) ...  
-----END ENCRYPTED PRIVATE KEY-----`;

const privateKeyObject = createPrivateKey({
  key: privPem,
  format: 'pem',
  passphrase: 'your-passphrase-if-encrypted'
});

// 2. From a DER buffer:
import fs from 'fs';
const derBuffer = fs.readFileSync('./myKey.der');
const publicKeyObject = createPublicKey({
  key: derBuffer,
  format: 'der',
  type: 'spki'       // or "pkcs1" if your DER is in PKCS#1 format
});

// 3. From a JWK (JSON Web Key) object:
const jwk = {
  kty: 'RSA',
  n: '0vx7...bL8',
  e: 'AQAB',
  d: 'X4cT...DZu6__',
  // plus p, q, dp, dq, qi if it's a private JWK
};
const importedPrivateKey = createPrivateKey({ key: jwk, format: 'jwk' });
const importedPublicKey  = createPublicKey({ key: jwk, format: 'jwk' });
```

**Parameters for `createPrivateKey()`:**

* `key`: `Buffer | string | object` (e.g. JWK)
* `format`: `'pem' | 'der' | 'jwk'`
* If the PEM is encrypted (PKCS#8 or PKCS#1), supply `passphrase: string | Buffer`.
* If using DER, also specify `type: 'pkcs1' | 'pkcs8'`.

**Parameters for `createPublicKey()`** are similar, but for public PEM/DER/JWK.

Once you have a `KeyObject`, you can use it directly in `crypto.sign(...)` or `createSign().sign(...)`. A `KeyObject` is safer than passing around raw `Buffers` or strings.

---

## 3. Signing Data (`createSign`)

When you want to produce a digital signature of some data (e.g. JSON payload, message, file hash), you typically:

1. Hash the data (internally, `Sign` does it for you).
2. Sign the hash with your private key.
3. Return a signature `Buffer` (or base64/hex‐encoded string).

### 3.1 Basic Flow

```js
import { createSign, constants } from 'crypto';

const data = Buffer.from('The quick brown fox'); // or a string

// 1. Choose an algorithm. Common choices: 'RSA-SHA256', 'RSA-SHA512', 'SHA256', 'SHA512', 'ecdsa-with-SHA256', etc.
const sign = createSign('RSA-SHA256');

// 2. Feed the data into the Sign object
sign.update(data);
sign.end(); // mark EOF

// 3. Produce the signature. Pass either:
//    • a `KeyObject` (recommended), OR
//    • a PEM string (or deriving from it, e.g. passphrase if encrypted)
const signature = sign.sign({
  key: privateKeyObject,   // e.g. from createPrivateKey() or generateKeyPairSync()
  padding: constants.RSA_PKCS1_PSS_PADDING,    // If using RSA-PSS
  saltLength: constants.RSA_PSS_SALTLEN_DIGEST // Recommended for PSS
});
// `signature` is a Buffer. You can `.toString('base64')` if needed for transport.
console.log('Signature (base64):', signature.toString('base64'));
```

#### Algorithm string

* For RSA with PKCS#1 v1.5 padding: use `'RSA-SHA256'` or `'RSA-SHA512'`.
* For RSA-PSS (recommended for new designs), use `createSign('sha256')` (or `'sha512'`), then in `sign.sign({ padding: PSS_PADDING, saltLength: ... })` you explicitly choose PSS.
* For ECDSA (e.g. P-256), use `createSign('SHA256')`. Node outputs a DER‐encoded signature (r || s format) by default.

#### Padding

##### For RSA‐PSS:

```js
const signature = sign.sign({
  key: privateKeyObject,
  padding: constants.RSA_PKCS1_PSS_PADDING,
  saltLength: constants.RSA_PSS_SALTLEN_DIGEST
});
```

##### For RSA PKCS#1 v1.5 (legacy, but still common):

```js
// no need to specify padding (it defaults to PKCS#1 v1.5):
const signature = sign.sign(privateKeyObject);
// or explicitly:
const signature = sign.sign({
  key: privateKeyObject,
  padding: constants.RSA_PKCS1_PADDING
});
```

#### Encoding

You can have Node return a `Buffer`, or directly return a string in `'hex'` or `'base64'`:

```js
// returning as Base64 string (instead of Buffer)
const signatureBase64 = sign.sign({
  key: privateKeyObject,
  padding: constants.RSA_PKCS1_PADDING
}, 'base64');
```

### 3.2 Example with ECDSA (Elliptic Curve)

```js
import { generateKeyPairSync, createSign, createPrivateKey, createPublicKey } from 'crypto';

// 1. Generate an EC key pair (prime256v1 / secp256r1 is common)
const { publicKey: ecPubPem, privateKey: ecPrivPem } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  publicKeyEncoding:  { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const ecPrivKeyObject = createPrivateKey({ key: ecPrivPem, format: 'pem' });
const ecPubKeyObject = createPublicKey(ecPubPem);

// 2. Sign:
const payload = Buffer.from(JSON.stringify({ foo: 'bar' }));
const sign = createSign('SHA256');
sign.update(payload);
sign.end();

// ECDSA uses DER-encoded signature by default (r || s).
const signature = sign.sign(ecPrivKeyObject); // Buffer

console.log('ECDSA Signature (hex):', signature.toString('hex'));
```

> For ECDSA, you do not specify padding: the default DER‐format output is correct.

> Verification (below) will expect exactly that DER‐encoded signature.

---

## 4. Verifying a Signature (`createVerify`)

Use the corresponding public key to verify a signature. You must feed the same data and algorithm:

```js
import { createVerify, constants } from 'crypto';

// Assume `payload`, `signature`, and `publicKeyObject` are known:
const verify = createVerify('RSA-SHA256');
verify.update(payload);
verify.end();

const isValid = verify.verify(
  {
    key: publicKeyObject, // the KeyObject or PEM string
    padding: constants.RSA_PKCS1_PSS_PADDING,   // if you used PSS when signing
    saltLength: constants.RSA_PSS_SALTLEN_DIGEST
  },
  signature // Buffer, or if your signature was Base64, Buffer.from(sigBase64, 'base64')
);

console.log('Signature valid?', isValid);
```

* Make sure the algorithm and padding match exactly what was used during signing.
* `verify.verify(...)` returns a boolean. If `false`, either data was altered or signature/public key mismatched.

---

## 5. `createPrivateKey` & `createPublicKey` in Detail

### `createPrivateKey(options)`

* **Input:**

  * `options.key`: `string | Buffer | Object`

    * If string/Buffer: PEM or DER.
    * If object: Assume a JWK.
  * `options.format`: `'pem' | 'der' | 'jwk'`.
  * `options.type`: `'pkcs1' | 'pkcs8'` (only for DER/PEM).
  * `options.passphrase`: (`string | Buffer`) if PEM is encrypted.
* **Output:** A `KeyObject` representing a private key.

**Typical usage:**

```js
const pemString = fs.readFileSync('/secrets/key.pem', 'utf8');
const privObj = createPrivateKey({ key: pemString, format: 'pem', passphrase: '...' });
```

* Store `KeyObject` in memory—Node will protect the key material from accidental exposure (e.g. not accidentally logged).

### `createPublicKey(options)`

* **Input:** Same as above (minus `passphrase`, since public keys aren’t encrypted).

  * `key`: public PEM (e.g. `-----BEGIN PUBLIC KEY-----` ...).
  * `format`: `'pem' | 'der' | 'jwk'`.
  * `type`: `'spki' | 'pkcs1'` (for public).
* **Output:** A `KeyObject` for the public key.

**Typical usage:**

```js
const pubPem = getFromAwsKms();
const pubObj = createPublicKey({ key: pubPem, format: 'pem' });
```

* Once you have a `KeyObject`, you never need to deal with raw PEM/DER strings again—just pass the `KeyObject` into `sign()`, `verify()`, or even into `encrypt()`/`decrypt()` functions.

---

## 6. Higher-Level Signing APIs

Node also offers convenience methods so you don’t have to manage `createSign` or `createVerify` objects manually:

### `crypto.sign(algorithm, data, privateKey)`

**Usage:**

```js
import { sign, constants } from 'crypto';
// data: Buffer or string
// privateKey: KeyObject or PEM string or { key: pemString, passphrase, ... }
const signature = sign(
  'RSA-SHA256',            // algorithm
  Buffer.from('hello'),    // data
  {
    key: privateKeyObject,          // or PEM string + passphrase
    padding: constants.RSA_PKCS1_PSS_PADDING,
    saltLength: constants.RSA_PSS_SALTLEN_DIGEST
  }
);
```

This is exactly the same as doing `createSign(algorithm)` + `.update(data)` + `.sign(privateKey)`. It’s just a one-liner:

```js
// Equivalent to above:
const signature = sign('SHA256', data, privateKeyObject);
```

### `crypto.verify(algorithm, data, publicKey, signature)`

**Usage:**

```js
import { verify, constants } from 'crypto';
const isOk = verify(
  'RSA-SHA256',
  Buffer.from('hello'),
  {
    key: publicKeyObject,  // or PEM string
    padding: constants.RSA_PKCS1_PSS_PADDING,
    saltLength: constants.RSA_PSS_SALTLEN_DIGEST
  },
  signatureBuffer
);
console.log(isOk); // true or false
```

Internally, it does exactly `createVerify(algorithm)` + `.update(data)` + `.verify(pubKey, sig)`.

> If you only have a single piece of data to sign (rather than a streaming scenario), it’s simpler to use these one-line helpers.

---

## 7. Other “Public/Private” KeyObject–Related APIs

While “sign/verify” is one major use case, Node’s `crypto` module supports a few other operations on asymmetric key pairs:

### `crypto.publicEncrypt(publicKey, buffer)` / `crypto.privateDecrypt(privateKey, buffer)`

* **Classic RSA encryption:** encrypt with a recipient’s public key, decrypt with your private.
* **Note:** RSA encryption is now generally discouraged for large payloads (you’d typically do hybrid‐encryption: generate a random AES key, encrypt data with AES, then encrypt AES key with RSA).

**Example:**

```js
import { publicEncrypt, privateDecrypt, constants } from 'crypto';

// Encrypt:
const encrypted = publicEncrypt(
  {
    key: publicKeyObject,
    padding: constants.RSA_PKCS1_OAEP_PADDING, // preferred over PKCS1 v1.5
    oaepHash: 'sha256'                              // e.g. SHA-256 for OAEP
  },
  Buffer.from('secret data')
);
// Decrypt:
const decrypted = privateDecrypt(
  {
    key: privateKeyObject,
    padding: constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  },
  encrypted
);
console.log(decrypted.toString()); // 'secret data'
```

### `crypto.privateEncrypt(privateKey, buffer)` / `crypto.publicDecrypt(publicKey, buffer)`

* Rarely used. “Private encrypt” is essentially “sign with raw RSA” (no hashing)—this is not a standard “signature” operation and should not be used in place of `sign()`.
* You’ll see `crypto.privateEncrypt` if you must interoperate with some legacy system that expects raw RSA cryptography.

### `crypto.diffieHellman()`

* For Diffie-Hellman key exchange: both parties derive a shared secret from each other’s public parameters.
* In modern code, you’d usually use ECDH (`crypto.createECDH(curveName)`), which returns a small, efficient key exchange mechanism (no need to deal with big integer math manually).

**Example (ECDH P-256):**

```js
import { createECDH } from 'crypto';

// Party A:
const alice = createECDH('prime256v1');
alice.generateKeys();
const alicePub = alice.getPublicKey(); // send to Bob

// Party B:
const bob = createECDH('prime256v1');
bob.generateKeys();
const bobPub = bob.getPublicKey(); // send to Alice

// Each side computes the shared secret:
const aliceShared = alice.computeSecret(bobPub);
const bobShared   = bob.computeSecret(alicePub);
console.log(aliceShared.equals(bobShared)); // true
```

### `crypto.generateKeyPair()` and `crypto.generateKeyPairSync()`

* Synchronous and asynchronous ways to generate new key pairs. We used `generateKeyPairSync()` above.
* If you need to generate keys at runtime without blocking the event loop, call:

```js
import { generateKeyPair } from 'crypto';
generateKeyPair('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase: 'pass' }
}, (err, pubPem, privPem) => {
  if (err) throw err;
  // pubPem / privPem are PEM strings
});
```

---

## 8. Putting It All Together: A Minimal RSA-PSS Example

Below is a concise end-to-end example (no unnecessary extras) showing:

1. Generating an RSA key pair (synchronous, at startup).
2. Wrapping them in `KeyObject` instances.
3. Using `crypto.sign` to create an RSA-PSS signature.
4. Using `crypto.verify` to check that signature.

```js
// file: rsa_pss_demo.js
import fs from 'fs';
import { generateKeyPairSync, createPrivateKey, createPublicKey, sign, verify, constants } from 'crypto';

//
// 1. Generate a new key pair (do this once; you could instead load from PEM on disk)
//
const { publicKey: pubPem, privateKey: privPem } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' } // no passphrase in this example
});

// (Optional) Persist to disk so you can reuse them later:
fs.writeFileSync('private-key.pem', privPem);
fs.writeFileSync('public-key.pem', pubPem);

// 2. Wrap the PEMs into KeyObjects
const privateKeyObj = createPrivateKey({ key: privPem, format: 'pem' });
const publicKeyObj  = createPublicKey({ key: pubPem, format: 'pem' });

//
// 3. The data you want to sign:
const message = Buffer.from('Hello, world! This must be signed.');

// 4. Sign with RSA-PSS (SHA-256 hash, PSS padding)
const signature = sign('sha256', message, {
  key: privateKeyObj,
  padding: constants.RSA_PKCS1_PSS_PADDING,
  saltLength: constants.RSA_PSS_SALTLEN_DIGEST
});

// 5. (Optional) Transmit or store `signature` (e.g. base64-encode it for JSON):
const signatureBase64 = signature.toString('base64');
console.log('Signature (Base64):', signatureBase64);

//
// At the receiver or later in your code, verify:
const incomingSignature = Buffer.from(signatureBase64, 'base64');

const isValid = verify('sha256', message, {
  key: publicKeyObj,
  padding: constants.RSA_PKCS1_PSS_PADDING,
  saltLength: constants.RSA_PSS_SALTLEN_DIGEST
}, incomingSignature);

console.log('Signature valid?', isValid); // → true
```

* We used `sign('sha256', data, options)` instead of manually `createSign` + `.update` + `.sign`, because there’s only one chunk of data here.
* We explicitly chose RSA-PSS (more secure than PKCS#1 v1.5 for new applications).
* We did not encrypt the private PEM (for simplicity), but in production, store the private key on disk (or secret manager) with a passphrase and load it with `createPrivateKey({ key: encryptedPem, passphrase: ... })`.

---

## 9. Other “Sign-like” Operations

Node’s `crypto` module also exposes:

* `crypto.createSign(algorithm)` — returns a `Sign` object. Use this when you need to feed data in multiple chunks (e.g. streaming a large file). After streaming all chunks via `.update()`, call `.sign(privateKey, [outputEncoding])`.
* `crypto.createVerify(algorithm)` — returns a `Verify` object for stream-signature verification.
* `crypto.createHmac(algorithm, key)` — computes an HMAC of data (symmetric). Not a public/private operation. Use it when you and a known party share a secret key and just want to ensure integrity.

**Example:**

```js
import { createHmac } from 'crypto';
const hmac = createHmac('sha256', Buffer.from('my-shared-secret'));
hmac.update('some message');
const digest = hmac.digest('hex');
// Send `digest` alongside your message. The receiver recomputes using the same shared key.
```

---

## 10. Best Practices & Security Considerations

* **Never hard-code private keys in your source.** Load them from a secure location (environment variable, container secret, secret manager).

* Use `createPrivateKey({ key: …, passphrase: … })` if your PEM is encrypted.

* Prefer RSA-PSS (with SHA-256 or SHA-512) for signatures over plain PKCS#1 v1.5, unless you have to interoperate with an older system expecting v1.5. PSS is provably secure under modern standards.

* Unless you need streaming signing, use the one-liner `crypto.sign(...)` / `crypto.verify(...)` instead of managing a `Sign`/`Verify` instance manually. It’s less code and less room for mistakes.

* Use `KeyObject` instead of raw PEM/`Buffer` where possible. This prevents accidental exposure or leaking of the raw key material in logs.

  ```js
  const privObj = createPrivateKey({ key: myPem, format: 'pem' });
  // Now pass `privObj` to sign/verify/encrypt/etc.—never pass the PEM again.
  ```

* **Store keys securely at rest.** If you must store a private key on disk, encrypt the PEM with a strong passphrase:

  ```js
  generateKeyPairSync('rsa', {
    /* … */,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase: '…' }
  });
  ```

  Or use a cloud KMS / hardware security module (HSM) so your application never directly touches the raw private key. Node can be configured to use signer callbacks (e.g., with AWS KMS, you call sign via an API instead of passing a local `KeyObject`).

* Be aware of data‐inclusion sequences. Always do `sign.update(data)` → `sign.end()` → `sign.sign(...)`. If you mix in different data or call `sign.sign` prematurely, the output is invalid. Similarly for verify: `verify.update(...)` → `verify.end()` → `verify.verify(...)`.

* Select a secure hash (`SHA-256` or above). Never use `MD5` or `SHA-1` for new designs.

* If you only need integrity/authenticity (not non-repudiation) in a two-party setting, consider HMAC (`createHmac`) instead: fewer moving parts and easier key management. Only use asymmetric signing when you must publish a public key for verification by third parties.

---

## 11. Quick Reference Table

| API                                             | Purpose                                                                        | Returns                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------- |
| `generateKeyPairSync(type, options)`            | Generate a new asymmetric key pair (RSA, EC, etc.)                             | `{ publicKey, privateKey }` (PEM/DER strings) |
| `generateKeyPair(type, options, callback)`      | Asynchronous version of `generateKeyPairSync`                                  | via callback                                  |
| `createPrivateKey(options)`                     | Import a private key (PEM/DER/JWK) into a `KeyObject`                          | `KeyObject`                                   |
| `createPublicKey(options)`                      | Import a public key (PEM/DER/JWK) into a `KeyObject`                           | `KeyObject`                                   |
| `sign(algorithm, data, privateKey[, encoding])` | One-liner: hash data, sign with private key, return `Buffer` or encoded string | `Buffer` or string                            |
| `createSign(algorithm)`                         | Streamable "Sign" instance: call `.update(...)`, then `.sign(...)`             | `Sign` instance                               |
| `verify(algorithm, data, publicKey, signature)` | One-liner: verify signature against data and public key                        | `boolean`                                     |
| `createVerify(algorithm)`                       | Streamable "Verify" instance: call `.update(...)`, then `.verify(...)`         | `Verify` instance                             |
| `publicEncrypt(options, buffer)`                | Encrypt with public key (usually RSA-OAEP)                                     | `Buffer`                                      |
| `privateDecrypt(options, buffer)`               | Decrypt with private key (usually RSA-OAEP)                                    | `Buffer`                                      |
| `createHmac(algorithm, key)`                    | Compute an HMAC over data chunks—symmetric MAC                                 | `Hmac` instance                               |

---

### Encrypting Data With Node.js

In a recent side project I came upon the need to securely store credentials in a database that I can later retrieve and use as part of the application. I know that Node.js has a very extensive crypto module, so I knew it was possible, though I wasn’t sure on the specifics.

Typically when storing passwords or other similar secrets, values are hashed but in my case I needed to encrypt/decrypt data since I need to access the original value after accessing it from my database. To make this work, we can use the createCipheriv function along with a secret key and initialization vector (IV) to encrypt and decrypt our data.

```js
import crypto from "node:crypto"

const algorithm = "aes-256-cbc"
const secretKey = process.env.SECRET_KEY

if (!secretKey) {
  throw new Error("SECRET_KEY environment variable is required")
}

const key = crypto
  .createHash("sha512")
  .update(secretKey)
  .digest("hex")
  .substring(0, 32)

const iv = crypto.randomBytes(16)

export function encrypt(data: string) {
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv)
  let encrypted = cipher.update(data, "utf-8", "hex")
  encrypted += cipher.final("hex")

  // Package the IV and encrypted data together so it can be stored in a single
  // column in the database.
  return iv.toString("hex") + encrypted
}

export function decrypt(data: string) {
  // Unpackage the combined iv + encrypted message. Since we are using a fixed
  // size IV, we can hard code the slice length.
  const inputIV = data.slice(0, 32)
  const encrypted = data.slice(32)
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(key),
    Buffer.from(inputIV, "hex"),
  )

  let decrypted = decipher.update(encrypted, "hex", "utf-8")
  decrypted += decipher.final("utf-8")
  return decrypted
}
```

The nice thing about this implementation is that it returns a plain string with the IV and encrypted data sandwiched together. As long as you use the decrypt function, it knows how to properly decrypt the value making it really simple to store in a database.

```js
const password = "my secret password, don't tell anyone!"
const encrypted = encrypt(password)
const decrypted = decrypt(encrypted)
```

I’ll probably also explore re-implementing this same logic using the web crypto API. But that’s for another day!

## Bottom Line

* `createPrivateKey` / `createPublicKey`: Turn PEM/DER/JWK into safe, in-memory `KeyObject`s.
* `createSign` / `createVerify`: Build “sign” or “verify” streams for signing data incrementally.
* `sign()` / `verify()`: One-line wrappers when you just have a single `Buffer`/string payload.
* When using RSA, prefer PSS padding. When using EC, pick a modern curve (e.g. `prime256v1`, `secp384r1`, or `Ed25519`).
* Keep private keys encrypted at rest, load them via `createPrivateKey({ passphrase })`, and never log raw PEM.

With that, you should have a clear mental map of how Node’s `createPublicKey`/`createPrivateKey` and `createSign`/`createVerify` calls all fit together. If you need to do anything beyond signing (e.g. encryption, key exchange, HMAC), the rest of the `crypto` module follows the same pattern: import or generate a `KeyObject`, pick an algorithm, feed in data, and call the appropriate one-line helper (or use a streamable object).
