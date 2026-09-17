# Setting up the FUB Custom GPT (bring your own API key)

Each person who wants to use this creates **their own** Custom GPT from this schema
and enters **their own** Follow Up Boss API key into it. Nobody's key passes through
anyone else's account or server — ChatGPT calls the FUB API directly using the key
you put into your own GPT's configuration.

## 1. Create the GPT

1. In ChatGPT, go to **Explore GPTs → Create** (or **My GPTs → Create a GPT**).
2. Switch to the **Configure** tab.
3. Set a name (e.g. "FUB Assistant") and description.
4. Paste the contents of [`gpt-instructions.md`](./gpt-instructions.md) into the
   **Instructions** field.

## 2. Add the Action

1. Scroll to **Actions → Create new action**.
2. Click **Import from URL** or paste directly, and paste in the contents of
   [`openapi-gpt-actions.json`](./openapi-gpt-actions.json) as the schema.
3. ChatGPT should show ~24 parsed operations across people, notes, tasks,
   appointments, deals, custom fields, smart lists, templates, users, and calls.

## 3. Set up authentication

1. In the Action's **Authentication** settings, choose **API Key**.
2. Set **Auth Type** to **Basic**.
3. Get your Follow Up Boss API key: in FUB, go to **Admin → API** (or ask your
   account admin if you don't have access) and copy your personal API key.
4. Enter it in the **API Key** field.

> **⚠️ Needs a one-time hands-on check:** Follow Up Boss expects the HTTP `Authorization`
> header as `Basic <base64 of "yourkey:">` — the key followed by a colon, then
> base64-encoded, per FUB's own docs. It's not yet confirmed whether ChatGPT's "Basic"
> API Key field does that encoding for you automatically, or expects you to paste in
> an already-prepared value. **Test with a simple read-only action first** (e.g. "list
> my people"):
> - If it works with just the raw key pasted in, you're done.
> - If you get an auth error, precompute the value yourself before pasting it in:
>   ```bash
>   echo -n "yourapikeyhere:" | base64
>   ```
>   and paste that base64 string into the API Key field instead (with or without a
>   leading "Basic " — try both if the first attempt fails).
> - Once you find the version that works, this note should get corrected — if you
>   figure it out, let the repo maintainer know so this doc can be fixed for the next
>   person.

## 4. Test it

Try a few things in a new chat with your GPT:
- "Show me my 5 most recently added contacts"
- "What Smart Lists do I have?"
- "Log a note on [contact name] saying I left them a voicemail"

## Notes

- This GPT **cannot delete anything** — the schema has no delete operations by
  design. Deletions still have to happen in the FUB app directly.
- Your API key is stored by ChatGPT as part of your own GPT's configuration, the same
  way any other Custom GPT credential is stored. It is not visible to other people who
  might later use a GPT you choose to share — when you share a GPT, ChatGPT does not
  expose your configured Action credentials to other users; each user configuring
  their own copy would need to add their own key. If you want to share this GPT
  broadly, point people at this repo so they build their own copy with their own key,
  rather than sharing yours directly.
