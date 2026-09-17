# Privacy Policy — fub-mcp Custom GPT

This page covers the ChatGPT Custom GPT built from this repo's
[`gpt/`](./gpt) files. (For the standalone MCP server instead, see the
[README](./README.md) — it runs entirely on your own machine and doesn't
involve ChatGPT or OpenAI at all.)

## How this GPT handles your data

This GPT connects directly to the Follow Up Boss (FUB) API using the API key
you configure in ChatGPT's own Action authentication settings. When you use
it:

- **No data passes through or is stored by the creator of this GPT.** Every
  request goes straight from ChatGPT to Follow Up Boss's servers using your
  own credentials; there is no server or database in between that the
  creator operates or has access to.
- **Follow Up Boss** receives and processes the API requests/responses (your
  CRM data) as it normally would for any API access to your account. See
  [Follow Up Boss's Privacy Policy](https://www.followupboss.com/legal-pages/privacy-policy)
  for how they handle it, and their
  [API Terms of Use](https://docs.followupboss.com/reference/fub-api-tou)
  for API-specific terms.
- **OpenAI / ChatGPT** handles the conversation itself — including whatever
  CRM data (contact names, notes, phone numbers, etc.) FUB's API returns and
  ChatGPT displays back to you. That's subject to OpenAI's own data handling,
  retention, and model-training policies for ChatGPT conversations, the same
  as any other chat. See
  [OpenAI's Privacy Policy](https://openai.com/policies/privacy-policy/) and
  ChatGPT's data controls in your own account settings for specifics
  (including how to opt out of having conversations used for model training).

## Your API key

Your Follow Up Boss API key is entered directly into ChatGPT's Action
authentication settings for your own copy of this GPT — it is stored by
OpenAI as part of your GPT's configuration, not sent to or seen by the
creator of this GPT at any point.

## Not affiliated with Follow Up Boss

This GPT is an independent, unofficial tool. It is not affiliated with,
endorsed by, or built by Follow Up Boss / Enchant LLC.
