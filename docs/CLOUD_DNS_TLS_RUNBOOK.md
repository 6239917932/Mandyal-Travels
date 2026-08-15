# Cloud, domain, DNS, and TLS runbook

Deploy immutable builds behind a managed HTTPS edge and private application/database networking. Provision separate development, staging, and production projects; enforce least privilege, protected production changes, health checks, autoscaling limits, and rollback to the previous verified artifact.

Production requires an owned domain, reviewed DNS records, automated TLS certificates and renewal alerts, HTTP-to-HTTPS redirect, HSTS after validation, secure cookies, restricted origins, CDN/cache rules that never cache private pages, DDoS/WAF controls, and a tested rollback. Provider account creation and DNS changes remain external deployment actions.
