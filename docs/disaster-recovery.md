# Disaster Recovery Plan

This document outlines the recovery protocols for catastrophic failures, encompassing database corruption, full infrastructure loss, and integration disconnections.

## Definitions
- **Recovery Point Objective (RPO):** 24 Hours. Data loss should not exceed the last 24 hours of system operations. (With Supabase Point-in-Time Recovery, this is significantly reduced).
- **Recovery Time Objective (RTO):** 2 Hours. The system should be fully operational within 2 hours of a declared disaster.

## Scenarios & Mitigation

### 1. Database Corruption or Loss

TaskFlow relies heavily on its PostgreSQL database hosted via Supabase. If the database is dropped, corrupted, or unavailable:

**Mitigation (Supabase Backups):**
1. Navigate to the Supabase Dashboard -> Database -> Backups.
2. If Point-in-Time Recovery (PITR) is enabled (Pro Plan and above), select the precise minute prior to the corruption event.
3. If PITR is disabled, select the most recent daily logical backup and click **Restore**.
4. During the restoration phase, the database will be offline.
5. Once restoration is complete, restart the TaskFlow Docker container to clear old connection pools.

### 2. Full Server Infrastructure Loss

If the physical or virtual server hosting the TaskFlow Node.js backend is permanently destroyed or compromised:

**Mitigation (Stateless Redeployment):**
The TaskFlow application is entirely stateless. 
1. Provision a new Linux VM on your chosen cloud provider (AWS, DigitalOcean, etc.).
2. Re-point your domain's DNS A/AAAA records to the new IP address.
3. Install Docker and Docker Compose on the new host.
4. Clone the repository and reconstruct the `.env` file from your secure password manager/vault.
5. Run `docker-compose up -d --build`.
6. Traffic will resume once DNS propagates. Note: Because webhooks are retry-based, ClickUp will automatically replay any webhooks that failed during the downtime.

### 3. Compromised Secrets (Leakage)

If `.env` secrets (e.g., ClickUp API Token, JWT Secret) are leaked to unauthorized parties:

**Mitigation:**
1. **JWT Secret:** Immediately generate a new secret and update the `.env`. Restart the server. All existing user sessions will instantly terminate, forcing re-authentication.
2. **ClickUp / Teams Tokens:** Revoke the compromised tokens inside the respective platform dashboards (ClickUp Integrations, Microsoft Entra/Power Automate). Generate new credentials, update `.env`, and restart.
3. Audit `audit_logs` in the database to determine if unauthorized access was utilized prior to revocation.
