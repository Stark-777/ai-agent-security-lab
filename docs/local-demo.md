# Local API walkthrough

Use Node 24.22.2 and run `npm ci --ignore-scripts` followed by `npm run check` from the repository root.

## Use the Phase 2 API

Enable the **public synthetic test tokens** explicitly. They are lab fixtures, not real credentials and not a production login system:

```sh
LAB_AUTH_MODE=fixtures npm start
```

Without that flag, protected routes return 401 even for known fixture tokens; `/health` stays public. For Compose, use `LAB_AUTH_MODE=fixtures docker compose up --build --wait` (container execution remains unverified locally).

In a second terminal:

```sh
# 401: no authenticated identity
curl -i http://127.0.0.1:3000/v1/me

# 200: server-derived user, tenant, and role; no token in the response
curl -i http://127.0.0.1:3000/v1/me \
  -H 'Authorization: Bearer lab-only-north-agent-a'

# 201: create a private conversation; save the returned id
curl -i http://127.0.0.1:3000/v1/conversations \
  -H 'Authorization: Bearer lab-only-north-agent-a' \
  -H 'Content-Type: application/json' \
  -d '{"title":"Subscription question"}'
```

Set `conversation_id` to the returned UUID, then use the following commands. Restarting the server resets all conversations.

```sh
conversation_id='REPLACE_WITH_RETURNED_UUID'

# 201: only the owner can append; the server fixes role to user
curl -i "http://127.0.0.1:3000/v1/conversations/$conversation_id/messages" \
  -H 'Authorization: Bearer lab-only-north-agent-a' \
  -H 'Content-Type: application/json' \
  -d '{"content":"Please explain my subscription."}'

# 200: owner sees their history
curl -i "http://127.0.0.1:3000/v1/conversations/$conversation_id" \
  -H 'Authorization: Bearer lab-only-north-agent-a'

# 404: same-tenant manager still cannot read another user's history
curl -i "http://127.0.0.1:3000/v1/conversations/$conversation_id" \
  -H 'Authorization: Bearer lab-only-north-manager'

# 404: a foreign-tenant manager also has no access
curl -i "http://127.0.0.1:3000/v1/conversations/$conversation_id" \
  -H 'Authorization: Bearer lab-only-harbor-manager'
```

`npm run smoke` runs an automated live HTTP version on a temporary loopback port and stops its own server. The full identity/token table is in the [authorization matrix](authorization-matrix.md). No model processes messages yet, and no assistant replies are fabricated. Titles are limited to 120 characters, messages to 2,000 JavaScript string units, conversations to 50 per actor, and messages to 100 per conversation. Input bodies still have the 8 KiB transport limit. These capacities bound local memory; they are not a complete rate-limit policy.
