# BunnyBotsSim2026

Local, browser-based 2D simulator for the 2026 BunnyBots Cone Zone game. It uses React Router, Vite, Convex, Matter.js physics, shadcn/ui, and Xbox-compatible browser gamepads.

## Run

Use the same command locally or as a Codex project action:

```sh
bun run start
```

This installs dependencies, starts the Convex development deployment, and starts Vite at <http://localhost:5174>.

If that port is already being served by an existing session, reuse that session or stop it before starting another one.

## Simulator controls

- Left stick: translate; right stick: rotate
- LT: intake; RT: score; A: auto-align; Y: request the alliance bunny at the nearest friendly human-player station
- A setup can enable the keyboard fallback: WASD translates, Q/E rotates, F intakes, G scores, R aligns, and T requests the bunny.

Guests can run matches locally. Sign in with Convex Auth to persist completed match results and event logs to the connected personal-team Convex development deployment.

## Checks

```sh
bun run typecheck
bun run lint
bun run build
```
