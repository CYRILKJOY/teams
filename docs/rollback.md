# Rollback Procedure

This document outlines the procedure to revert TaskFlow to a previous stable state following a failed deployment or severe regression.

## 1. Application Rollback (Code Reversion)

Because TaskFlow is deployed via Docker, rolling back the application code is a rapid, straightforward process assuming images are properly tagged.

### Procedure
1. Identify the stable Docker image tag (e.g., `taskflow:v1.2.0`). 
2. Edit the `docker-compose.yml` file to target the specific stable tag instead of `latest` or the faulty tag.
3. Pull the specific image and recreate the container:
   ```bash
   docker-compose pull
   docker-compose up -d --force-recreate
   ```
4. Verify the application has successfully booted by curling the `/api/v1/health` endpoint.

> [!TIP]
> If you are building images directly on the production host, you can revert by checking out the previous stable git commit and running `docker-compose build` before `docker-compose up -d`.

## 2. Database Migration Rollback

Database schema rollbacks are significantly more complex and dangerous than code rollbacks, as data loss can easily occur if columns or tables are destructively modified.

### Best Practices (Forward-Only)
TaskFlow strongly advises an **additive-only** migration strategy. 
- Never rename or delete columns in a single deployment. 
- Always add new columns as nullable, copy data over time, and only delete the old column in a subsequent release.
- If backward compatibility is maintained, rolling back the application code will **not** require rolling back the database.

### Procedure (If Absolute Reversion is Required)
If a destructive migration was pushed and must be reverted:

1. **Pause Traffic:** Shut down the Node.js container (`docker-compose stop`) to ensure no new data is written during the rollback.
2. **Execute Reversion Script:** Supabase tracks migrations in the `supabase_migrations.schema_migrations` table. However, Supabase CLI `db reset` destroys all data. To safely rollback a specific migration in production, you must manually write and execute a SQL `DOWN` migration script against the production database using the Supabase SQL Editor.
3. **Verify Integrity:** Confirm the schema matches the older application code expectation.
4. **Resume Traffic:** Start the container (`docker-compose start`) running the older application image.
