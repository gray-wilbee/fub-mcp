# Setting up the FUB Custom GPT (bring your own API key)

Each person who wants to use this creates **their own** Custom GPT from this schema
and enters **their own** Follow Up Boss API key into it. ChatGPT stores the credential and calls FUB from OpenAI's infrastructure; the
repository maintainer does not operate an intermediary. Keep the GPT private.
Sharing a configured GPT can give other users access under your FUB identity.

*(A version that lets everyone share one GPT link with true per-user sign-in — via
FUB's OAuth support — is being investigated as a future improvement. This bring-your-
own-copy approach is the one that works today.)*

## 1. Create the GPT

1. In ChatGPT, go to **Explore GPTs → Create** (or **My GPTs → Create a GPT**).
2. Switch to the **Configure** tab.
3. Set a name and description.
4. Paste the contents of [`gpt-instructions.md`](./gpt-instructions.md) into the
   **Instructions** field.

## 2. Add the Action

1. Scroll to **Actions → Create new action**.
2. Paste in the contents of [`openapi-gpt-actions.json`](./openapi-gpt-actions.json)
   as the schema.
3. ChatGPT should show 29 parsed operations across people, lead/event
   registration, notes, tasks, appointments, deals, pipelines, custom fields,
   smart lists, email/text templates, users, calls, and text messages.

## 3. Set up authentication

1. In the Action's **Authentication** settings, choose **API Key**.
2. Set **Auth Type** to **Basic**.
3. Get your Follow Up Boss API key: in FUB, go to **Admin → API** (or ask your
   account admin if you don't have access) and copy your personal API key.
4. This repository's tested Basic-auth configuration uses base64 of the API key
   followed by a colon (blank password). Base64 is reversible and is itself a
   credential. Prepare it with a trusted offline password-manager utility, then
   paste it only into the Action authentication field. Do not type a key into
   `echo`, command arguments, chat, online encoders, or shared terminals. Recheck
   the current Builder behavior before publishing instructions for a new release.

## 4. Add the privacy policy

In the Action's settings, set the **Privacy Policy** URL to:
```
https://github.com/gray-wilbee/fub-mcp/blob/main/PRIVACY.md
```

## 5. Test it

Try a few things in a new chat with your GPT:
- "Show me my 5 most recently added contacts"
- "What Smart Lists do I have?"
- Start with reads. Test writes only in an authorized disposable account after review.

## Notes

- The schema exposes no DELETE operations. Updates can still replace or remove
  data, and events can trigger workflows; this is not a read-only integration.
- Your API key (in its base64-encoded form) is stored by ChatGPT as part of your own
  GPT's configuration, the same way any other Custom GPT credential is stored. It is
  not visible to other people who might later use a GPT you choose to share — when
  you share a GPT, ChatGPT does not expose your configured Action credentials to
  other users; each user configuring their own copy would need to add their own key.
  **If you want to share this GPT broadly, point people at this repo so they build
  their own copy with their own key, rather than sharing yours directly** — sharing
  a GPT you've already configured means every request from everyone who uses that
  link runs under YOUR FUB account, not theirs.
