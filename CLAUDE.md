# simple-graph-bun

A SQLite graph database for the bun runtime.

---

## Constitution
* Simple maintainable code, do not over abstract
* Do not add additional dependencies

## Tech Stack
* Bun
* SQLite

## Bun
- Always use Bun, do not use Node.js APIs or npm package manager
- Bun automatically loads .env, so don't use dotenv.
- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `pnpm run <script>`
- ALWAYS `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.
