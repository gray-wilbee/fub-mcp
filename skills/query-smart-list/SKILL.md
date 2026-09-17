---
name: query-smart-list
description: Use when the user wants to see or act on the people in a Follow Up Boss Smart List, whether they give a Smart List name or an ID. Requires the fub-mcp MCP server's list_smart_lists and list_people tools.
---

# Query a Follow Up Boss Smart List

Follow Up Boss Smart Lists are saved people-searches. `GET /people` can filter by
`smartListId`, but there's no way to filter by *name* directly — you have to resolve
the name to an ID first.

## Procedure

1. **If the user already gave you a numeric Smart List ID**, skip straight to step 3.

2. **If the user gave a name** (e.g. "show me my Hot Leads list"):
   - Call `list_smart_lists` (paginate with `offset` if the account has more than one
     page — most accounts won't).
   - Match the user's wording against the returned `name` fields yourself. Don't guess
     or invent an ID.
   - If there's an exact or obviously-unique match, use its `id`.
   - If there are multiple plausible matches (e.g. "Leads" matches "New Leads" and
     "Hot Leads"), list the candidates back to the user and ask which one they meant
     rather than picking for them.
   - If there's no match at all, say so — don't fall back to an unfiltered `list_people`
     call and pretend it's the smart list.

3. **Fetch the people**: call `list_people` with `smartListId=<id>`. Use the `fields`
   param to keep the response small if the user only needs a few fields (e.g.
   `firstName,lastName,phones,tags`) — especially important if the list is large, since
   this tool defaults to `limit=100` per page.

4. **If the list has more than 100 people** and the user wants the full set, keep
   paginating with `offset` (watch `_metadata.total` vs how many you've fetched so far)
   rather than stopping at the first page silently.
