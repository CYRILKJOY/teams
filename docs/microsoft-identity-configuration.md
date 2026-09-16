# Microsoft 365 / Entra Identity Configuration

This guide explains how to obtain and configure the immutable Microsoft identifiers for your employees in TaskFlow.

## Why "Object IDs"?

TaskFlow uses the Microsoft Entra **Object ID (`oid`)** to map employees, rather than an email address or User Principal Name (UPN).

Emails and UPNs can change (e.g., due to a name change or domain migration). The `oid` is a globally unique, immutable identifier within your Entra ID tenant. This ensures that a user's mapping never breaks. When Teams sends a webhook to TaskFlow, the verified sender token includes this `oid`.

## 1. Locating a User's Object ID

Administrators can find an employee's `oid` in the Azure Portal (Microsoft Entra admin center).

1. Go to the [Microsoft Entra admin center](https://entra.microsoft.com/).
2. Navigate to **Identity > Users > All users**.
3. Search for the employee you wish to map.
4. Click on their name to open their profile.
5. In the **Overview** tab, look for the **Object ID** property (it looks like a UUID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
6. Copy this Object ID.

## 2. Updating Identity Mappings in TaskFlow

Using the TaskFlow REST API, an Administrator or Manager can map the ClickUp ID and Microsoft Object ID to an internal Employee record.

### API Endpoint

```http
POST /api/v1/employees/:employeeId/mapping
Authorization: Bearer <MANAGER_OR_ADMIN_JWT>
Content-Type: application/json

{
  "microsoft_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clickup_id": "1234567"
}
```

### Auditing
Every time an identity mapping is updated, the system creates a strict, tamper-proof record in the `audit_logs` table. This provides a transparent history of who changed which mapping and when.
