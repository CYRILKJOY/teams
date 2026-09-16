# Deployment Guide

This guide details the procedure for deploying the TaskFlow application to a production environment.

## Prerequisites

1. **Host Environment:** A Linux server with Docker and Docker Compose installed.
2. **Domain Configuration:** A registered domain (e.g., `taskflow.example.com`) pointed at your server's IP address.
3. **Supabase Database:** A production Supabase project with an initialized PostgreSQL database.
4. **Third-Party Credentials:** Active credentials for ClickUp and Microsoft Teams.

## 1. Environment Configuration

On your production server, clone the repository and create a `.env` file in the root directory based on `.env.example`:

```env
NODE_ENV=production
PORT=3000

# Security (Generate a strong, random 64-character hex string)
JWT_SECRET=your_secure_random_string_here

# Supabase Production Database
SUPABASE_URL=https://[PROJECT_ID].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# ClickUp Integration
CLICKUP_API_TOKEN=your_production_clickup_token
CLICKUP_WEBHOOK_SECRET=your_production_clickup_webhook_secret

# Microsoft Teams Integration
TEAMS_WEBHOOK_URL=https://prod.powerautomate.com/workflows/...
TEAMS_INBOUND_WEBHOOK_SECRET=your_production_teams_inbound_secret
```

> [!WARNING]
> Never commit your `.env` file to source control. Keep it securely restricted on the production server.

## 2. HTTPS & Reverse Proxy Configuration

TaskFlow requires HTTPS for secure webhook delivery and API access. We recommend using **Caddy** or **Nginx** acting as a reverse proxy in front of the Node.js Docker container.

### Example Caddyfile (Automatic SSL):
```caddyfile
taskflow.example.com {
    reverse_proxy localhost:3000
}
```

### Example Nginx Configuration:
```nginx
server {
    listen 443 ssl;
    server_name taskflow.example.com;

    ssl_certificate /etc/letsencrypt/live/taskflow.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/taskflow.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

## 3. Database Initialization

Before starting the application, apply the database schema. Navigate to the `supabase/` directory and apply the migrations in sequential order using the Supabase CLI:

```bash
supabase link --project-ref [YOUR_PRODUCTION_PROJECT_REF]
supabase db push
```

## 4. Production Build and Deployment

TaskFlow uses Docker Compose for simple, reliable deployment.

1. **Build the Production Image:**
   ```bash
   docker-compose build
   ```
   *Note: The Dockerfile utilizes a multi-stage build, ensuring only production dependencies are packaged in the final lightweight Alpine image.*

2. **Start the Service:**
   ```bash
   docker-compose up -d
   ```

3. **Verify Deployment:**
   Check the application logs to confirm a successful startup:
   ```bash
   docker-compose logs -f
   ```

## Production Deployment Checklist

- [ ] All `.env` secrets are populated with production credentials.
- [ ] Supabase database migrations (0000 - 0005) have been applied.
- [ ] Docker image built successfully.
- [ ] Container started without FATAL logs.
- [ ] Reverse proxy is routing traffic to port 3000.
- [ ] SSL certificate is active and valid.
- [ ] `curl https://taskflow.example.com/api/v1/health` returns `{"status":"ok"}`.
- [ ] `curl https://taskflow.example.com/api/v1/ready` returns `{"status":"ready"}` (validates DB connection).
- [ ] ClickUp webhook is registered to the production URL.
- [ ] Power Automate inbound webhook points to the production URL.
