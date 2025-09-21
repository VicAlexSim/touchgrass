# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TouchGrass is a burnout prevention app built with React (Vite) frontend and Convex backend. It tracks developer wellbeing through multiple data sources including webcam mood detection, GitHub commits, Linear project management, and Wakatime coding activity to calculate burnout risk scores.

## Development Commands

**Start development servers (frontend + backend):**
```bash
npm run dev
```

**Start frontend only:**
```bash
npm run dev:frontend
```

**Start backend only:**
```bash
npm run dev:backend
```

**Build for production:**
```bash
npm run build
```

**Lint and type check:**
```bash
npm run lint
```

This will run TypeScript checks on both frontend and backend, validate Convex schema, and build the project.

## Architecture

### Backend (Convex)
- **Database Schema** (`convex/schema.ts`): Comprehensive schema covering all data sources including mood data, work sessions, burnout scores, Linear projects, GitHub commits, and Wakatime data
- **Burnout Analysis** (`convex/burnout.ts`): Core burnout risk calculation logic with factor scoring and trend analysis
- **Integrations**:
  - `convex/github.ts`: GitHub commit pattern analysis
  - `convex/linear.ts`: Linear project management integration
  - `convex/wakatime.ts`: Wakatime coding activity tracking
  - `convex/webcam.ts`: Webcam mood detection and presence tracking
- **Break Management** (`convex/breaks.ts`): Break timer and session tracking

### Frontend (React + Vite)
- **Main App** (`src/App.tsx`): Root component with authentication
- **Dashboard** (`src/Dashboard.tsx`): Primary user interface
- **Components** (`src/components/`): UI components including Settings and shadcn/ui components
- **Build Tool**: Vite with React plugin and path aliases (`@/` → `src/`)

### Key Data Flow
1. **Data Collection**: Multiple sources (webcam, GitHub, Linear, Wakatime) feed into Convex tables
2. **Risk Analysis**: `burnout.ts` calculates daily risk scores using weighted factors and trend analysis
3. **User Interface**: Dashboard displays risk scores, recommendations, and allows configuration

## Integration Setup

The app requires several API integrations:

- **GitHub**: Personal Access Token for commit analysis (optional, improves rate limits)
- **Linear**: OAuth integration for project management data
- **Wakatime**: API key for coding activity tracking
- **TwelveLabs**: Video analysis API for advanced mood detection

## Deployment

Connected to Convex deployment `perfect-setter-780`. Uses Convex Auth with anonymous authentication by default.

## Important Files
- `convex/schema.ts`: Complete database schema
- `convex/burnout.ts`: Core burnout calculation logic
- `package.json`: All development commands and dependencies
- `vite.config.ts`: Frontend build configuration with path aliases