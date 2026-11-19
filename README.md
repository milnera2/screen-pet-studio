# Screen Pet Studio

Screen Pet Studio is a lightweight desktop companion built with Tauri (Rust) and React. It places small, interactive pet widgets on your desktop that respond to clicks and reflect lightweight system state, all managed from a central dashboard.

## Features

- **Desktop pets** – Transparent, always-on-top pet windows that float over your applications and stay out of the taskbar.
- **Smart click-through** – Pet windows ignore mouse input by default so you can work through them; hovering a pet enables clicking and dragging.
- **Drag to move** – Grab a pet to reposition it anywhere on the screen.
- **Master power switch** – Sleep or wake all pets at once from the dashboard or system tray.
- **Modular tools** – Toggle background tools per pet:
  - Focus / Pomodoro Timer (configurable length, default 25 minutes)
  - Battery Fatigue (reports battery level via the Web Battery API)
- **Studio dashboard** – Manage every pet independently, enable/disable individual pets, choose which pet of a type is shown on the desktop, delete pets, and toggle global power.
- **System tray** – Keep pets running while the dashboard is hidden. Right-click the tray icon to open the studio, toggle pet power, or quit.
- **Add Pet wizard** – Create a custom pet, assign it to a tool, set its size, upload an optional idle image (GIF/PNG/JPG), and (for timers) set the countdown length. Each pet is added to the list with a unique id — creating a new pet never replaces an existing one.
- **Asset management** – Uploaded images are copied into the app's local data directory.
- **Persistent configuration** – Pet positions, per-pet enabled states, active pet selection, global settings, and power state are saved between sessions.

## Tech Stack

- **Core & OS interop:** Tauri (Rust)
- **Frontend:** React 18, Vite, TypeScript
- **Styling:** Tailwind CSS
- **Animation:** Framer Motion
- **State:** Zustand (with persisted storage)
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- [Rust](https://rustup.rs/) (stable)
- The Tauri system dependencies for your platform (see the [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)).

### Install dependencies

```bash
npm install
```

### Run in development

```bash
npm run tauri dev
```

This starts the Vite dev server and the Rust Tauri application together.

### Build for production

```bash
npm run build
npm run tauri build
```

Production installers are output to `src-tauri/target/release/bundle`.

## Project Structure

```
src/                 # React frontend
  main.tsx           # Application entry point
  App.tsx            # Routes between dashboard and pet windows
  store.ts           # Zustand state store (persisted)
  types.ts           # Shared TypeScript types and tool catalog
  Dashboard.tsx      # Studio dashboard window
  PetWindow.tsx      # Individual pet overlay window
  AddPetWizard.tsx   # Add-pet creation wizard
  lib/tauri.ts       # Thin wrappers over Tauri IPC commands
src-tauri/           # Rust backend
  src/lib.rs         # Window management, tray, commands, asset saving
  tauri.conf.json    # Tauri application configuration
  Cargo.toml         # Rust dependencies
```

## Window Architecture

- **Dashboard (`main`)** – The control center. Has a custom title bar (minimize, maximize, close-to-tray). Closing it hides the window to the system tray while pets keep running.
- **Independent pet windows** – Every pet receives its own transparent, borderless, always-on-top, taskbar-skipped overlay window. Pets of the same type do not share position, enabled state, or timer configuration.

## Configuration

Pet configurations, tool states, global settings, and the master power state are persisted in the browser's local storage via Zustand's `persist` middleware. Uploaded pet assets (images and audio) are copied into the Tauri app data directory under an `assets/` folder.

## License

[MIT](LICENSE)
