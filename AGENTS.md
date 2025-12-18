# Agent Guidelines for Erudify

## Build, Lint, and Test Commands

- **Development**: `npm run dev` (Next.js dev server on port 3000)
- **Build**: `npm run build` (Next.js production build)
- **Lint**: `npm run lint` (ESLint with Next.js config)
- **Test (E2E)**: `npm test` (Playwright tests, auto-starts preview server on :8787)
- **Test UI**: `npm test:ui` (Playwright with interactive UI)
- **Unit Tests**: `npx vitest` (Vitest for unit tests like `src/lib/pinyin.test.ts`)
- **Single Test**: `npx vitest src/lib/pinyin.test.ts` (run specific test file)
- **Preview**: `npm run preview` (Cloudflare OpenNext preview on :8787)
- **Deploy**: `npm run deploy` (Cloudflare deployment)

## Code Style Guidelines

- **TypeScript**: Strict mode enabled. Always type function parameters and return types explicitly.
- **Imports**: Use `@/*` path alias for src imports (e.g., `import { foo } from "@/lib/bar"`).
- **React**: Use functional components with TypeScript. No default exports for components (except page.tsx files).
- **Formatting**: Follow Next.js conventions. Use double quotes for JSX, Tailwind CSS for styling.
- **Naming**: camelCase for variables/functions, PascalCase for components/types, SCREAMING_SNAKE_CASE for constants.
- **Error Handling**: Return explicit error types or throw typed errors. Avoid silent failures.
- **Comments**: Export functions should have JSDoc-style comments explaining purpose, especially in lib files.
