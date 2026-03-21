# infi

`infi` is an Electron app with a React renderer and a minimal React Flow canvas prototype.

## Stack

- Electron Forge
- React 19
- Vite 7
- TypeScript
- TanStack Router
- Tailwind CSS 4
- React Flow (`@xyflow/react`)

## Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm start
```

Key files:

- `src/main.ts` for the Electron main process
- `src/app.tsx` for the renderer app entry
- `src/routes/index.tsx` for the main canvas view
- `src/components/flow/window-node.tsx` for the custom React Flow node

## License

MIT
