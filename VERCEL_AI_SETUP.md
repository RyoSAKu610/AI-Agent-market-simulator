# Optional LLM thinking for NEON MYTHOS

The public game remains on GitHub Pages. The optional thought panel calls a separate Vercel Function at `/api/agent-think`; set up a Vercel deployment from this repository before enabling it.

## Provider setup

1. Deploy the repository to a Vercel project (the repo's canonical GitHub Pages deployment remains unchanged).
2. In the Vercel project settings, add `OPENROUTER_API_KEY` as a server-side environment variable for Production and Preview. Never put the key in a `NEXT_PUBLIC_*` variable or in browser JavaScript.
3. Optionally set `OPENROUTER_MODEL`. The default is `openrouter/free`, which routes to currently available free models.
4. Redeploy after setting variables.

## Client endpoint

The client calls the fixed endpoint `https://neon-mythos.vercel.app/api/agent-think`. The Vercel project must be linked/deployed and the environment variable must be present for this URL to work. If the project uses a different domain, update the fixed `THINK_ENDPOINT` in `neon-mythos-agent-thinking.js`; never take the endpoint from query parameters or user input.

## Limits and behaviour

- This is optional assistance for agent narration and planning. It does not directly mutate market balances, execute trades, or override the simulation engine's existing decisions.
- When the model service is missing, rate-limited or fails, the endpoint responds with a small deterministic rules-based plan.
- The OpenRouter free tier currently advertises 50 API requests per day; this is not unlimited. Provider/model availability and free-tier limits can change.
- This endpoint is intended for a browser game. Before publishing it publicly, add an app-specific request budget or verified session check if stronger abuse protection is needed.
