# TouchGrass - AI-Powered Burnout Prevention Platform

> **🏆 TwelveLabs Challenge Submission** - Advanced video analysis for developer wellbeing

TouchGrass is a production-ready burnout prevention platform that leverages AI-powered video analysis, multi-source data integration, and real-time monitoring to proactively protect developer mental health. Built with enterprise-grade architecture and scalable design patterns.

## 🌟 Why TouchGrass Stands Out

### Production-Ready Architecture

- **Type-safe full-stack development** with end-to-end TypeScript
- **Real-time reactive backend** powered by Convex with automatic scaling
- **Comprehensive data schema** supporting multiple integration sources
- **Robust error handling** and rate limiting for external APIs
- **Modular codebase** with clear separation of concerns

### Advanced TwelveLabs Integration

- **State-of-the-art video analysis** using Pegasus-1 model for mood detection
- **Intelligent video chunking** (10-second segments) for optimal processing
- **Multi-modal analysis** combining facial expressions, body language, and presence detection
- **Confidence scoring** and fallback mechanisms for reliable mood assessment
- **Efficient blob storage** with Convex for seamless video upload pipeline

### Scalable Data Architecture

- **Multi-source data fusion**: GitHub commits, Linear projects, Wakatime coding activity, webcam analysis
- **Advanced burnout algorithm** with weighted factor scoring and trend analysis
- **Real-time session tracking** with break management and productivity metrics
- **Comprehensive user settings** with configurable thresholds and preferences

## 🚀 Quick Start

```bash
# Start both frontend and backend in development mode
npm run dev

# Frontend only (React + Vite)
npm run dev:frontend

# Backend only (Convex)
npm run dev:backend

# Production build with full type checking
npm run build

# Comprehensive linting and validation
npm run lint
```

## 🏗️ Architecture Overview

### Frontend (React + TypeScript + Vite)

```
src/
├── components/          # Reusable UI components with shadcn/ui
├── hooks/              # Custom React hooks for data fetching
├── lib/                # Utility functions and shared logic
├── utils/              # Helper functions and constants
├── App.tsx             # Main application with authentication
├── Dashboard.tsx       # Primary user interface
└── main.tsx           # Application entry point
```

### Backend (Convex + TypeScript)

```
convex/
├── schema.ts           # Comprehensive database schema (8 tables)
├── burnout.ts          # Core burnout risk calculation engine
├── webcam.ts           # TwelveLabs video analysis integration
├── github.ts           # GitHub commit pattern analysis
├── linear.ts           # Linear project management integration
├── wakatime.ts         # Coding activity tracking
├── breaks.ts           # Break timer and session management
└── auth.config.ts      # Authentication configuration
```

### Data Flow Architecture

1. **Multi-Source Data Collection**
   - 📹 **TwelveLabs Pegasus-1**: Real-time mood analysis from webcam
   - 🔄 **GitHub API**: Commit patterns and coding velocity
   - 📊 **Linear API**: Story points and project management data
   - ⏱️ **Wakatime API**: IDE usage and coding time tracking

2. **AI-Powered Risk Assessment**
   - Advanced burnout algorithm with 6 weighted factors
   - Trend analysis across 7-day windows
   - Confidence scoring and data availability checks
   - Real-time threshold monitoring with notifications

3. **Real-Time User Experience**
   - Live dashboard with risk visualization
   - Proactive break reminders and interventions
   - Configurable settings and preferences
   - Session tracking with automatic detection

## 🎥 TwelveLabs Integration Deep Dive

### Advanced Mood Detection Features

- **Multi-modal analysis**: Facial expressions, body language, environmental cues
- **Temporal consistency**: Smoothing algorithms to prevent mood flickering
- **Confidence thresholding**: Fallback to previous states for low-confidence predictions
- **Privacy-first design**: Local processing with encrypted blob storage
- **Batch processing**: Efficient video queuing for sustained analysis

### Production Optimizations

- **Rate limiting**: Intelligent API call management
- **Error recovery**: Graceful degradation when TwelveLabs is unavailable
- **Data validation**: Comprehensive input sanitization and type checking
- **Monitoring**: Built-in analytics for API usage and performance

## 🔧 Environment Setup & Configuration

### Required API Keys

```bash
# TwelveLabs (Primary Integration)
TWELVELABS_API_KEY=your_twelvelabs_key

# Optional: GitHub (Enhanced Rate Limits)
GITHUB_TOKEN=your_github_token  # 5,000 req/hr vs 60 req/hr

# Optional: Linear (Project Management)
LINEAR_API_KEY=your_linear_key

# Optional: Wakatime (Coding Activity)
WAKATIME_API_KEY=your_wakatime_key
```

### Production Deployment

- **Convex Cloud**: Automatic scaling with global edge distribution
- **Type-safe deployments**: Schema validation and migration support
- **Real-time synchronization**: WebSocket connections with offline support
- **Security**: Auth0 integration with role-based access control

## 🧪 Code Quality & Testing

### Type Safety

- **100% TypeScript coverage** across frontend and backend
- **Convex schema validation** with automatic type generation
- **API contract enforcement** with runtime validation
- **End-to-end type safety** from database to UI components

### Development Workflow

```bash
# Comprehensive validation pipeline
npm run lint    # TypeScript + ESLint + Convex schema validation
npm run build   # Production build with optimization
npm run dev     # Hot reload with type checking
```

### Scalability Features

- **Modular architecture**: Easy to add new data sources
- **Configurable algorithms**: Adjustable burnout calculation weights
- **Multi-tenant ready**: User isolation and data privacy
- **Performance monitoring**: Built-in metrics and logging

## 🎯 Innovation Highlights

### Unique Value Propositions

1. **Proactive Prevention**: Catches burnout early before symptoms manifest
2. **Multi-Source Intelligence**: Combines productivity, mood, and behavioral data
3. **AI-Powered Insights**: TwelveLabs video analysis for unprecedented accuracy
4. **Developer-Centric**: Built by developers, for developers
5. **Privacy-Conscious**: Local processing with encrypted data storage

### Future Scalability

- **Federated Learning**: Train models across users while preserving privacy
- **Advanced Integrations**: Sleep tracking, calendar analysis, Slack sentiment
- **Enterprise Features**: Team dashboards, manager insights, organization analytics
- **ML Pipeline**: Custom burnout prediction models with continuous learning

---

**Built with**: Convex • React • TypeScript • TwelveLabs Pegasus-1 • Vite • Tailwind • Auth0
