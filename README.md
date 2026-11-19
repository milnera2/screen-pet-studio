# Screen Pet Studio

Screen Pet Studio is a desktop companion built with Tauri and React. It gives the user interactive, context-aware pet windows for tools such as focus timers and battery monitoring.

This project is currently serving as a Proof of Concept and is not fully finished 

## Features

- Transparent, always-on-top desktop pet windows
- Dragging and clicking pet overlays
- Independent pet configurations
- Focus timer and battery monitoring pets
- Master power and individual pet controls
- System tray integration
- Add-pet wizard with optional uploaded images
- Persistent Zustand configuration

## Tech Stack

- Tauri 2 and Rust
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Zustand
- Lucide React

## Requirements

- Node.js 18 or newer
- Rust stable
- Platform Tauri prerequisites

## Install

```bash
npm install
```

## Development

```bash
npm run tauri dev
```

Use the Tauri command rather than `npm run dev` alone. The desktop window APIs and Tauri IPC commands require the Tauri runtime.

## Production Build

```bash
npm run build
npm run tauri build
```

Build output is written to `src-tauri/target/release/bundle`.

## Project Layout

```text
src/                 React frontend
src-tauri/           Rust/Tauri backend
public/              Static frontend assets
README.md            Project documentation
LICENSE              MIT license
```

## Configuration

Pet settings and power state are stored in the browser's local storage. Uploaded assets are copied to the Tauri app data directory.

## License

MIT
