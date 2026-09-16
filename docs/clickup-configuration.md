# ClickUp Configuration Guide

This guide explains how to properly configure the ClickUp integration in TaskFlow.

## 1. Obtain a ClickUp API Token

You need an API Token to communicate with ClickUp. TaskFlow uses the token to fetch task details and sync assignees.

### For Personal Use / Development
1. Log in to ClickUp.
2. Click your Avatar in the bottom left -> **My Settings**.
3. Scroll down to **Apps** on the left menu.
4. Under **API Token**, generate a Personal Token.
5. Add this token to your `.env` file as `CLICKUP_API_TOKEN`.

### For Production
If using OAuth, follow the [ClickUp OAuth Flow](https://clickup.com/api/developer-portal/authentication/) to generate the token dynamically, but for backend service-to-service tasks, a permanent token is standard.

## 2. Register a Webhook

TaskFlow relies on webhooks to receive real-time updates when tasks are created or modified.

1. Ensure your TaskFlow server is publicly accessible (use `ngrok` for local development: `ngrok http 3000`).
2. Make a POST request to ClickUp's webhook creation endpoint using your `CLICKUP_API_TOKEN`:

```bash
curl -i -X POST \
  'https://api.clickup.com/api/v2/team/YOUR_TEAM_ID/webhook' \
  -H 'Authorization: YOUR_CLICKUP_API_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "endpoint": "https://YOUR_DOMAIN/api/v1/webhooks/clickup",
    "events": [
      "taskCreated",
      "taskUpdated",
      "taskDeleted",
      "taskStatusUpdated",
      "taskAssigneeUpdated",
      "taskDueDateUpdated",
      "taskPriorityUpdated",
      "taskMoved"
    ]
  }'
```

3. Note the `secret` returned in the response.
4. Add this secret to your `.env` file as `CLICKUP_WEBHOOK_SECRET`. TaskFlow uses this to validate the HMAC signature of incoming webhooks to ensure they genuinely originated from ClickUp.

## 3. Verify Integration

1. Create a task in ClickUp.
2. Check your TaskFlow logs. You should see `Processing ClickUp task event`.
3. Verify the task appears in your local `tasks` database table.
