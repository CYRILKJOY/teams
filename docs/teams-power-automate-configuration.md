# Microsoft Teams Notification Delivery Setup

TaskFlow pushes notifications directly to Microsoft Teams using a Microsoft Power Automate workflow. This avoids the overhead of managing a full Azure Bot Framework deployment while maintaining 100% security, because the immutable Microsoft Object ID is strictly controlled by the TaskFlow backend.

## 1. Create the Power Automate Flow

1. Go to [Power Automate](https://make.powerautomate.com/).
2. Create a new **Instant cloud flow** and skip the trigger selection for now.
3. Add the **"When an HTTP request is received"** trigger.
4. Set the **Request Body JSON Schema** to:

```json
{
  "type": "object",
  "properties": {
    "user": {
      "type": "string"
    },
    "card": {
      "type": "object"
    }
  }
}
```

## 2. Add the Teams Action

1. Add a new action: **"Post card in a chat or channel"** (Microsoft Teams).
2. Configure it as follows:
   - **Post as**: Flow bot
   - **Post in**: Chat with Flow bot
   - **Recipient**: Select the `user` dynamic content from the HTTP trigger (This will be the immutable Object ID we mapped in Phase 5).
   - **Adaptive Card**: Select the `card` dynamic content from the HTTP trigger.

## 3. Save and Configure TaskFlow

1. Save the workflow.
2. Power Automate will now generate an **HTTP POST URL** in the trigger step.
3. Copy this URL.
4. Add it to your TaskFlow `.env` file:

```env
TEAMS_WEBHOOK_URL=https://prod-123.westus.logic.azure.com:443/workflows/...
```

## Security Note

The webhook URL acts as a secret. Anyone with this URL can post messages to your employees acting as the Flow bot. Ensure `TEAMS_WEBHOOK_URL` is kept securely in your production environment variables.
