<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`bunx convex ai-files install`.

<!-- convex-ai-end -->

## Project commands

- Use Bun exclusively for package management and scripts.
- Run the full development stack with `bun run start`; it installs dependencies, starts Convex development, and starts Vite.
- Before handing off code changes, run `bun run typecheck`, `bun run lint`, and `bun run build`.

## Architecture boundaries

- Use React Router 7 for routing, layouts, and navigation.
- Use Convex for persisted domain data, live queries, mutations, actions, and authentication.
- Never copy Convex query results into Zustand. Zustand is only for ephemeral client UI state.
- Prefer the installed shadcn/ui Base UI components over hand-rolled controls.
- Keep theme values in CSS variables and theme mode in next-themes.
