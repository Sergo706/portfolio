---
title: mTLS CookBook With Caddy
description: A comprehensive cookbook for configuring Mutual TLS (mTLS) authentication using the Caddy web server.
date: 2026-07-15
image: /knowledge-base/mtls.jpeg
readingTime: 10
contentType: tutorial
category: networking
tags:
 - mTLS
 - Caddy
 - Security
 - Networking
---


Mutual TLS (mTLS) provides robust authentication by requiring both the server and client to present valid certificates. This tutorial guides you through setting up mTLS with Caddy, creating a private certificate authority (CA), and configuring client certificates.

## Overview

This setup uses four distinct nodes to demonstrate a complete infrastructure. The examples use internal IP addresses (LAN and WireGuard) to restrict access.

| Node | Purpose | LAN IP | WireGuard IP |
| --- | --- | --- | --- |
| **Database VM** | MySQL, Grafana, and Loki | `10.10.10.1` | None |
| **API VM** | Backend server (e.g., Strapi) running Caddy with mTLS | `10.10.10.2` | `10.100.102.109` |
| **BFF VM** | Public-facing Caddy proxy and Cloudflare tunnel | `10.10.10.3` | `10.100.102.103` |
| **Workstation** | Local machine or browser client | `10.10.10.10` | `10.100.102.102` |

## PKI Requirements

A successful mTLS deployment requires several cryptographic files. Keep private keys strictly confidential on their respective machines.

| File | Location | Purpose | Secret |
| --- | --- | --- | --- |
| `root.crt` | API VM, BFF VM, Workstation | Public certificate of your private CA | No |
| `root.key` | API VM ONLY (`/var/lib/caddy/.../root.key`) | CA private key used to sign client certificates | **Yes** |
| `server.key` & `server.crt` | API VM | Identifies the server to connecting clients | **Yes** (Key) |
| Client Certificates (`*.crt`) | API VM (`/etc/caddy/client-leaves/`) and Clients | Whitelisted leaf certificates | No |
| Client Keys (`*.key`) | BFF VM, Workstation | Signs the client side of the handshake | **Yes** |

::warning
Never distribute `root.key` or any `.key` file across the network. Private keys must remain on the device where they are generated.
::

## Caddy Configuration

Configure Caddy on the backend to enforce mTLS verification, and configure the frontend proxy to provide the required client certificate.

### Backend Server (API VM)

Add the following configuration to the API VM's `Caddyfile` to enforce client certificate verification and restrict access to specific IP addresses.

```caddyfile [Caddyfile]
{
    # Whitelist specific proxies that forward traffic
    trusted_proxies 10.10.10.3 10.10.10.2
    trusted_proxies_strict true
}

https://content.com {
    tls internal

    tls {
        client_auth {
            mode require_and_verify
            
            # Trust the root CA and specific whitelisted client certificates
            trusted_ca_cert_file          /etc/caddy/client-leaves/root.crt
            trusted_leaf_cert_file        /etc/caddy/client-leaves/strapi.crt
            trusted_leaf_cert_file        /etc/caddy/client-leaves/strapi-ws.crt
        }
    }

    encode gzip

    @allowedIPs {
        remote_ip 10.10.10.3 10.10.10.10
    }
    
    handle @allowedIPs {
        reverse_proxy 127.0.0.1:1337
    }

    handle {
        respond "Access Denied" 403
    }
}
```

### Frontend Proxy (BFF VM)

Configure the proxy to present a client certificate when forwarding requests to the secure backend.

```caddyfile [Caddyfile]
http://127.0.0.1:8080 {
    reverse_proxy https://10.10.10.2:443 {
        transport http {
            tls_server_name content.com
            tls_trusted_ca_certs /var/lib/caddy/mtls/root.crt
            tls_client_auth      /var/lib/caddy/mtls/strapi.crt /var/lib/caddy/mtls/strapi.key
        }
    }
}
```

::note
If using a tunnel like Cloudflared, direct it to `http://127.0.0.1:8080`.
::

## Client Certificate Operations

Generate a new client certificate for each workstation or service that needs access to the API.

### 1. Create a Key and CSR (Workstation)

Generate a private key and a Certificate Signing Request (CSR) on the client machine.

```bash [Terminal]
# Generate a 4096-bit RSA private key
openssl genpkey -algorithm RSA -out ~/client.key -pkeyopt rsa_keygen_bits:4096

# Create a certificate signing request
openssl req -new -key ~/client.key -subj "/CN=workstation-client" -out ~/client.csr

# Transfer the CSR to the API VM for signing
scp ~/client.csr user@api-vm:/tmp/
```

### 2. Sign the Certificate (API VM)

Use the Caddy internal CA to sign the client's CSR. This creates a valid client certificate.

```bash [Terminal]
CA_DIR=/var/lib/caddy/.local/share/caddy/pki/authorities/local
CSR=/tmp/client.csr
CRT=/etc/caddy/client-leaves/client.crt

# Sign the CSR to issue a 1-year certificate
sudo openssl x509 -req -in $CSR -CA $CA_DIR/root.crt -CAkey $CA_DIR/root.key \
  -CAcreateserial -out $CRT -days 365 -sha256

# Fix ownership and permissions
sudo chown caddy:caddy $CRT
sudo chmod 644 $CRT

# Reload Caddy to recognize the new certificate
sudo caddy reload --config /etc/caddy/Caddyfile
```

### 3. Import the Certificate (Workstation)

Transfer the signed certificate back to the workstation and bundle it into a PKCS#12 (`.p12`) file for browser installation.

```bash [Terminal]
# Fetch the signed certificate from the API VM
scp user@api-vm:/etc/caddy/client-leaves/client.crt ~/

# Bundle the key and certificate (you will be prompted to set an export password)
openssl pkcs12 -export -inkey ~/client.key -in ~/client.crt -certfile ~/root.crt -name "Secure-Client" -out ~/client.p12

# Clean up the raw files after importing the bundle into your browser
shred -u ~/client.key ~/client.crt ~/client.p12
```

::tip
To revoke access, simply delete the client's `.crt` file from `/etc/caddy/client-leaves/` on the API VM and reload Caddy.
::

## Network Security

Restrict network traffic using UFW and WireGuard to ensure clients can only connect via authorized paths.

### UFW Rules

Configure the firewall on each node to drop unexpected traffic.

```bash [Terminal]
# Allow MySQL access strictly from the API VM
sudo ufw allow in on wg0 proto tcp from 10.10.10.2 to any port 9000 comment 'MySQL from API'

# Allow incoming HTTPS traffic on the API VM from the proxy
sudo ufw allow in proto tcp from 10.10.10.3 to any port 443 comment 'HTTPS from BFF'
```

### Express Application Setup

If you run an Express backend behind Caddy, configure the application to trust the proxies forwarding the traffic.

```typescript [app.ts]
// Trust the local loopback and the BFF VM proxy
app.set('trust proxy', (ip: string) => {
  return ip === '127.0.0.1' || ip === '10.10.10.3';
});
```

## Toolbox and Verification

Use these commands to troubleshoot and verify your mTLS configuration.

| Task | Command |
| --- | --- |
| Verify key and certificate match | `openssl rsa -in key.pem -noout -modulus \| openssl md5`<br>`openssl x509 -in cert.pem -noout -modulus \| openssl md5` |
| Test connection manually | `openssl s_client -connect content.com:443 -cert client.crt -key client.key -CAfile root.crt` |
| Validate Caddyfile syntax | `sudo caddy validate --config /etc/caddy/Caddyfile` |
| Format Caddyfile | `sudo caddy fmt --overwrite /etc/caddy/Caddyfile` |

To quickly test authentication from the command line:

```bash [Terminal]
# Should succeed and return HTTP 200
curl -sv https://content.com/admin --cert ~/client.crt --key ~/client.key --cacert ~/root.crt -o /dev/null

# Should fail and return an OpenSSL alert (certificate required)
curl -k https://content.com/admin
```