# Contributing to Helm

Thank you for your interest in contributing to Helm! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 20+ 
- pnpm 9+
- Git
- OpenCode CLI installed (`npm install -g @anthropics/opencode`)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/BioInfo/helm.git
cd helm

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Start development server
pnpm dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5001

## Project Structure

```
helm/
├── frontend/          # React + TypeScript PWA
│   ├── src/
│   │   ├── api/       # API clients
│   │   ├── components/# UI components
│   │   ├── hooks/     # React hooks
│   │   ├── stores/    # Zustand state stores
│   │   └── lib/       # Utilities
├── backend/           # Hono + Bun server
│   └── src/
│       ├── routes/    # API endpoints
│       ├── services/  # Business logic
│       └── db/        # SQLite database
├── shared/            # Shared types and config
└── docs/              # Documentation
```

## Development Guidelines

### Code Style

- **TypeScript**: Strict mode, no `any` types
- **React**: Functional components with hooks
- **Styling**: Tailwind CSS with dark mode support
- **State**: Zustand for global state

### Commit Messages

Use conventional commits:

```
feat: add session renaming
fix: terminal font rendering on macOS
docs: update README with Docker instructions
chore: update dependencies
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Run type check: `pnpm --filter frontend build`
6. Commit with clear message
7. Push and open a PR

### Testing

```bash
# Run backend tests
pnpm test:backend

# Type check frontend
pnpm --filter frontend build
```

## Areas for Contribution

### Good First Issues

- UI/UX improvements
- Documentation updates
- Bug fixes
- Test coverage

### Larger Features

Check the [Roadmap](./README.md#roadmap) for planned features. Open an issue to discuss before starting major work.

### Documentation

- Improve README clarity
- Add tutorials/guides
- Document API endpoints

## Architecture Notes

### Key Technologies

- **Frontend**: React 19, Vite, Tailwind, Zustand
- **Backend**: Hono, Bun, SQLite (better-sqlite3)
- **Terminal**: xterm.js with WebGL renderer
- **PWA**: Workbox for offline support

### API Design

- REST endpoints under `/api/`
- OpenCode proxy at `/api/opencode/*`
- SSE for real-time updates

### State Management

- React Query for server state
- Zustand for UI state
- IndexedDB for offline cache

## Getting Help

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Join discussions in PR comments

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
