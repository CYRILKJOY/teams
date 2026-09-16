# Microsoft Teams Acknowledgement Workflow Setup

TaskFlow sends interactive Adaptive Cards to employees via Teams and securely receives their responses back through Power Automate.

## 1. Modify the Power Automate Flow

Previously, we used **"Post card in a chat or channel"**. We must now wait for the user's interactive response.

1. Go to your Power Automate flow created in Phase 6.
2. Delete the **"Post card in a chat or channel"** action.
3. Add the action **"Post an Adaptive Card and wait for a response"**.
4. Configure it:
   - **Post as**: Flow bot
   - **Post in**: Chat with Flow bot
   - **Message**: Set to the `card` dynamic content from the HTTP trigger.
   - **Recipient**: Set to the `user` dynamic content from the HTTP trigger.

## 2. Forward the Response to TaskFlow

When the user clicks a submit button (e.g., "I will complete this"), the flow resumes. The payload inside the card button contains `notification_id` and `response`.

1. Add a new **HTTP** action below the "Post an Adaptive Card..." action.
2. Configure it:
   - **Method**: `POST`
   - **URI**: `https://your-taskflow-domain.com/api/v1/webhooks/teams/acknowledgement`
   - **Headers**:
     - `Authorization`: `Bearer your_teams_inbound_secret` (This MUST match `TEAMS_INBOUND_WEBHOOK_SECRET` in `.env`).
     - `Content-Type`: `application/json`
   - **Body**: 
     ```json
     {
       "microsoft_id": "@{triggerOutputs()?['body/user']}",
       "notification_id": "@{outputs('Post_an_Adaptive_Card_and_wait_for_a_response')?['body/data/notification_id']}",
       "response": "@{outputs('Post_an_Adaptive_Card_and_wait_for_a_response')?['body/data/response']}"
     }
     ```

## Security Guarantees

- **No Spoofing**: Because the `microsoft_id` is passed forward from our own original triggering payload (which was mapped on the backend), the user cannot spoof their identity inside the Teams UI.
- **Webhook Authentication**: The shared secret ensures that only this specific Power Automate flow can submit acknowledgements to the backend.
