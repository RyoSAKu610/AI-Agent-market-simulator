# Optional LLM thinking for NEON MYTHOS

The public game remains on GitHub Pages. The optional thought panel calls a separate Vercel Function at `/api/agent-think`; set up a Vercel deployment from this repository before enabling it.

## Provider setup

1. Deploy this repository to the existing Vercel project only if its Git connection points at this repository. Otherwise create a separate Vercel project linked to this repo, with project root set to the repository root. Keep GitHub Pages as the canonical public game deployment.
2. In the Vercel project settings, add `GROQ_API_KEY` as a server-side environment variable for Production and Preview. Never put the key in a `NEXT_PUBLIC_*` variable or in browser JavaScript.
3. Optionally set `GROQ_MODEL`. The default is `openai/gpt-oss-120b`. Confirm that model remains available on the current Groq plan.
4. Redeploy after setting variables. The browser app does not require each player to supply an API key; the single secret stays on the Vercel server. Groq is still called via API behind the server, so this removes user-side API setup, not the underlying API requirement.

## Client endpoint

The client calls the fixed endpoint `https://neon-mythos.vercel.app/api/agent-think`. The Vercel project must be linked/deployed and the environment variable must be present for this URL to work. If the project uses a different domain, update the fixed `THINK_ENDPOINT` in `neon-mythos-agent-thinking.js`; never take the endpoint from query parameters or user input.

## Limits and behaviour

- This is optional assistance for agent narration and planning. It does not directly mutate market balances, execute trades, or override the simulation engine's existing decisions.
- When the model service is missing, rate-limited or fails, the endpoint responds with a small deterministic rules-based plan.
- The Groq Developer/free-tier limits vary by model and are not unlimited. Check the current official [rate-limit table](https://console.groq.com/docs/rate-limits) before relying on a particular RPM/RPD/TPM allowance.
- This endpoint is intended for a browser game. Before publishing it publicly, add an app-specific request budget or verified session check if stronger abuse protection is needed.
