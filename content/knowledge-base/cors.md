---
title: CORS Header Selection Cheatsheet
description: A quick reference guide for configuring Cross-Origin Resource Sharing (CORS) headers.
date: 2026-07-15
image: /knowledge-base/cors.png
readingTime: 8
contentType: guide
category: networking
tags:
 - CORS
 - HTTP
 - Security
 - API
---


Use this guide to choose appropriate values for your CORS headers. Adjust settings to balance security and usability based on your API’s needs.

---

## 1. Access-Control-Allow-Origin

* **Specific Domain** (e.g., `https://example.com`)

  * Restricts access to only trusted sites.
  * Use with credentials or sensitive data.
* **Dynamically Set Origin**

  * Read the request’s `Origin` header and echo it back when it matches an allow-list.
  * Prevents wildcard issues when using cookies or HTTP auth.
* **Wildcard (`*`)**

  * Allows any site when credentials are NOT involved.
  * *Do not* use with `Access-Control-Allow-Credentials: true`.

::warning
Never combine `*` with credentials—browsers will ignore the wildcard and refuse the request.
::

---

## 2. Access-Control-Allow-Credentials

* **`true`**

  * Enable when your API must accept cookies, HTTP authentication, or client certificates.
  * Must be paired with a non-wildcard `Access-Control-Allow-Origin`.
* **Omit or `false`**

  * Safer default if your API is completely public or stateless.

::tip
 Omitting this header prevents browser-side credential leaks by default.
::

---

## 3. Access-Control-Allow-Methods

* List only the HTTP methods your API actually supports. For example:

```http
Access-Control-Allow-Methods: GET, POST
```

* Avoid advertising methods you don’t implement (e.g., `DELETE`, `PUT`, `PATCH`) to reduce attack surface.

---

## 4. Access-Control-Allow-Headers

* Specify only the headers your clients need to send. Common examples:

```http
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
```

* Excluding unnecessary headers prevents unexpected or malicious data from being sent.

---

## 5. Access-Control-Max-Age

* Controls how long the browser caches preflight responses (in seconds).
* **Performance vs. Security:**

  * Longer cache (e.g., `86400` seconds = 24 hours) reduces preflight overhead.
  * Shorter cache (e.g., `600` seconds) ensures policy changes take effect sooner.

::info
A common compromise is `3600` (1 hour) for dynamic APIs, or `86400` (24 hours) for stable endpoints.
::

---

## 6. Access-Control-Expose-Headers

* Use when client-side JavaScript must read custom response headers beyond the CORS-safelisted ones.

* Example:

```http
Access-Control-Expose-Headers: X-Total-Count, X-Request-ID
```

* If omitted, browsers only expose simple headers (`Cache-Control`, `Content-Language`, `Content-Type`, `Expires`, `Last-Modified`, `Pragma`).

---

## Example Configuration Snippet (Express.js)

```js
app.use((req, res, next) => {
  const allowedOrigins = ['https://app.example.com'];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  res.header('Access-Control-Allow-Methods', 'GET,POST');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  res.header('Access-Control-Max-Age', '3600');
  res.header('Access-Control-Expose-Headers', 'X-Total-Count, X-Request-ID');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
```

---

## Summary

* **Origin:** Prefer specific domains or dynamic allow-lists over `*` when using credentials.
* **Credentials:** Only enable if necessary and always pair with a non-wildcard origin.
* **Methods & Headers:** Restrict to what your API supports and expects.
* **Caching:** Tune `Max-Age` for your performance/security needs.
* **Expose:** Declare any custom headers you need on the client side.

Keep this cheatsheet handy to ensure your CORS configuration remains secure and efficient!
