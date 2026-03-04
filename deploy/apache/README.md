# Apache Reverse Proxy Vhosts

These vhosts are for the public Apache instance that terminates TLS and
proxies to internal services. Each domain must have its own vhost; if a
domain is missing, Apache will fall back to the default vhost (often the
Keycloak vhost), which can cause unrelated hosts like `mail.semsm.com` to
show Keycloak pages.

## 1) Enable required modules

```
sudo a2enmod proxy proxy_http proxy_wstunnel headers ssl rewrite
```

## 2) Install and enable vhosts

1. Copy the vhost file(s) from `deploy/apache/vhosts/` to
   `/etc/apache2/sites-available/`.
2. Edit upstream targets as needed (see notes inside each file).
3. Enable the site(s) and reload Apache:

```
sudo a2ensite auth.femt.llc.conf
sudo a2ensite mail.semsm.com.conf
sudo systemctl reload apache2
```

## 3) Certificates

These configs assume certificates exist at:

```
/etc/letsencrypt/live/<domain>/
```

If you use a different path, update the `SSLCertificateFile` and
`SSLCertificateKeyFile` directives accordingly.
