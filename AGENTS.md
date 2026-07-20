# AGENTS.md

## Cursor Cloud specific instructions

ChromaScreen Mobile is a single, fully client-side Vite + React 19 PWA (mobile chroma-key / screen-test tool). There is no backend, database, or external API.

- Standard commands live in `package.json` `scripts`: `npm run dev` (Vite dev server on port 3000, host `0.0.0.0`), `npm run lint` (`tsc --noEmit`), `npm run build`, `npm run preview`.
- The dev server is the only service needed to run/test the product end to end; open `http://localhost:3000`.
- No environment variables are required. `@google/genai`, `express`, `dotenv`, and `.env.example` (`GEMINI_API_KEY`, `APP_URL`) are leftover Google AI Studio scaffolding that is never imported or used by the app.
- Manual-testing gotcha: the on-screen settings/gear button and control panel auto-hide quickly (gear ~3s, panel ~2s after inactivity). Click the screen to re-reveal them; expect to re-open the panel between interactions.
