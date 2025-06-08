# Seven

This project uses [Vite](https://vitejs.dev/) and [Vitest](https://vitest.dev/) for frontend development and testing.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the tests:
   ```bash
   npm test
   ```

`npm test` runs `vitest run` so the test suite executes once and exits.

## Session cookies

If the frontend and backend are served from different domains, the session
cookie requires `secure` and `SameSite=None` settings. The server already
detects production mode and applies these options so cross‑origin logins work.
