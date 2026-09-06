# Forza Fuel Overlay 🏎️⛽

A comprehensive fuel tracking and overlay system for **Forza Horizon 6**, designed to help drivers manage their fuel consumption in real-time.

## 🚀 Overview

This project provides a real-time overlay that displays fuel-related metrics by capturing telemetry data directly from the game. It uses a monorepo architecture to separate telemetry ingestion, fuel calculation logic, and the user interface.

## 🏗️ Architecture

The project is organized as a PNPM monorepo:

- **`apps/overlay`**: An Electron + React + Vite application that renders a transparent overlay on top of the game.
- **`apps/telemetry`**: A service responsible for listening to the game's UDP telemetry stream and processing incoming data packets.
- **`packages/fuel-engine`**: The core logic for calculating fuel usage, predicting remaining range, and analyzing efficiency.
- **`packages/shared`**: Common TypeScript types and utilities shared across the telemetry and overlay applications.
- **`data/`**: Local storage for processed telemetry, session history, and database records.

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [PNPM](https://pnpm.io/) (`npm install -g pnpm`)
- Forza Horizon 6 with Telemetry enabled in game settings.

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd forza-fuel-overlay
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

### Running the Project

To start the telemetry service and the overlay simultaneously:

```bash
pnpm run dev
```
*(Note: Ensure you have configured the correct UDP port and IP address to match your game settings.)*

## 📂 Project Structure

```text
├── apps/
│   ├── overlay/       # Electron + React UI
│   └── telemetry/    # Telemetry data ingestion
├── packages/
│   ├── fuel-engine/   # Fuel calculation logic
│   └── shared/        # Shared types & utils
├── data/             # Local data storage
└── scripts/           # Build and utility scripts
```

## 📝 License

Distributed under the ISC License. See `package.json` for more information.
