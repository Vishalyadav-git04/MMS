# MMS Frontend — React / TanStack Start

The frontend web interface for the Material / Master List Management System (MMS), built with React 19, TanStack Start, Vite, and Tailwind CSS.

---

## Quick Start & Running

### Prerequisites
- Node.js (v18+ recommended)
- npm or bun

### Installation

```sh
cd frontend
npm install
```

### Running Development Server

```sh
npm run dev
```

The frontend application will start on **http://localhost:3000**.
All API network calls are automatically proxied to the backend at `http://localhost:8000`.

---

## Environments & Configuration

Environment configurations are stored in `.env` files:

- **Local Development** (`.env`):
  ```env
  VITE_API_BASE_URL=http://localhost:8000
  ```
- **Staging Environment** (`.env.staging`):
  ```env
  VITE_API_BASE_URL=http://131.3.54.120
  ```

---

## Production Build & Export

To test and build the production bundle:

```sh
npm run build
```

To preview the built production bundle:

```sh
npm run preview
```

---

## File & Directory Structure

```
frontend/
├── .env                # Local environment configuration (VITE_API_BASE_URL)
├── .env.staging        # Staging environment configuration
├── package.json        # Dependencies and build scripts
├── vite.config.ts      # Vite dev server configuration (Port 3000, Proxy to :8000)
├── tsconfig.json       # TypeScript compiler settings
├── public/             # Static assets and public resources
└── src/
    ├── api/            # API client services and backend integrations
    ├── components/     # UI Components grouped by module screen:
    │   ├── admin/      # Admin module (MLCCS Capture, Domain Master, Links, Unit Obsn)
    │   ├── ep/         # EP Stores module (Domain Master, Gen Census, Capture EP, IUT)
    │   ├── mlccs/      # MLCCS View module
    │   ├── ro/         # Release Order (RO) module (Generate RO, Search RO, DRR Upload)
    │   ├── transfer/   # Transfer module (Inter Unit, Depot to Depot, Unit to Depot)
    │   ├── unit_holding/# Unit Holding module (Add/Approve/Update Eqpt Data)
    │   ├── dashboard/  # Main Dashboard components
    │   └── ui/         # Reusable UI elements (Radix primitives, Buttons, Inputs, Dialogs)
    ├── routes/         # TanStack file-based routing definitions
    ├── lib/            # Utility functions and shared helpers
    ├── server.ts       # TanStack Start SSR entry point
    └── styles/         # Global CSS styles and Tailwind setup
```
