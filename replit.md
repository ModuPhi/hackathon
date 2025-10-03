# DeFi Giving - Educational Portfolio Application

## Overview

DeFi Giving is an educational web application designed to teach users about DeFi concepts through interactive portfolio management. Users start with demo funds and learn about cryptocurrency operations like swapping, lending, borrowing, and donating to nonprofits through guided "Effects" - educational flows that simulate real DeFi operations in a safe, mock environment.

The application emphasizes plain English explanations over technical jargon, providing step-by-step guidance through complex financial operations with immediate visual feedback and clear validation messages.

**Effects are branded educational experiences sponsored by crypto companies:**
- **Effect B (Beginner)**: "Buy Your First Token" - Powered by Aptos - teaches simple token purchase
- **Effect A (Intermediate)**: "Collateralized Borrowing" - Powered by Aave - teaches asset-backed lending
  - Aave-branded educational content throughout the flow
  - Interactive LTV slider (0-100% visual range, enforced 80% max) with real-time health factor updates
  - Comprehensive success screen explaining DeFi lending concepts and user accomplishments

**Portfolio Dashboard Features:**
- **4-Card Summary Row** with info popovers:
  - Cash Available (credits ready to allocate)
  - Invested Assets (crypto holdings value)
  - Commitments (borrowed amounts, muted when zero)
  - Donated to Causes (cumulative donations, highlighted)
- Health Factor and technical debt metrics moved out of surface UI for simplicity
- Each card includes ⓘ icon with plain-English explanations in accessible popovers
- Smooth 200ms animations on value changes
- Responsive: 4-column on desktop, 2x2 grid on mobile

**Nonprofit Selection uses Kiva-style card design:**
- Multi-select up to 3 nonprofits with photos, locations, descriptions, and categories
- Selected nonprofits display as cards on the portfolio dashboard
- Effects are enabled once at least one nonprofit is selected

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React with TypeScript for type-safe component development
- Vite for fast development and optimized production builds
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching

**UI Component System:**
- Shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- CSS variables for theming (neutral base color scheme)
- Responsive design with mobile-first approach

**State Management:**
- Context API for portfolio state (`PortfolioContext`)
- React Query for API data fetching and caching
- Local component state for UI interactions
- Optimistic updates for immediate UI feedback

**Key Design Patterns:**
- Provider pattern for shared portfolio state
- Custom hooks for reusable logic (`usePortfolio`, `useIsMobile`, `useToast`)
- Compound component pattern for complex UI elements
- Controlled components for form inputs with validation

### Backend Architecture

**Runtime & Server:**
- Node.js with Express.js server
- TypeScript with ES modules for modern JavaScript features
- Development mode with hot module replacement via Vite
- Production build using esbuild for server bundling

**API Design:**
- RESTful endpoints under `/api` namespace
- JSON request/response format
- Middleware for request logging and body parsing
- Error handling with appropriate HTTP status codes

**Data Layer:**
- In-memory storage (`MemStorage`) for demo/development mode
- Drizzle ORM configured for PostgreSQL (schema-first approach)
- Type-safe database queries with TypeScript integration
- Shared schema definitions between client and server

**Storage Implementation:**
The current implementation uses an in-memory storage solution suitable for demo purposes. The architecture supports migration to persistent PostgreSQL storage through the configured Drizzle ORM setup.

### Data Storage Solutions

**Database Schema (PostgreSQL via Drizzle):**
- `users` - User authentication and identity
- `portfolios` - User financial state (credits, USDC, APT, debt, health factor) + `selectedNonprofits` JSON array (up to 3 IDs)
- `receipts` - Transaction history for Effects
- `nonprofits` - Available charitable organizations with `description`, `location`, `imageUrl`, `category` fields

**Data Access Patterns:**
- Repository pattern through `IStorage` interface
- Abstraction layer allowing storage implementation swap
- Type-safe insertions using Zod schemas derived from Drizzle tables
- Automatic UUID generation for primary keys

**Session Management:**
- Demo user approach for educational purposes
- Fixed "demo-user" account auto-created on first access
- No authentication required for simplified onboarding

### External Dependencies

**Core Libraries:**
- **@neondatabase/serverless** - PostgreSQL database driver compatible with serverless environments
- **drizzle-orm** & **drizzle-kit** - Type-safe ORM and migration tooling
- **@tanstack/react-query** - Server state management and caching
- **@hookform/resolvers** & **zod** - Form validation with schema validation
- **date-fns** - Date manipulation and formatting

**UI Component Libraries:**
- **@radix-ui/** (multiple packages) - Unstyled, accessible UI primitives
- **class-variance-authority** & **clsx** - Conditional CSS class management
- **tailwind-merge** - Intelligent Tailwind class merging
- **cmdk** - Command menu component
- **embla-carousel-react** - Carousel/slider functionality

**Development Tools:**
- **@replit/** plugins - Replit-specific development enhancements (error overlay, cartographer, dev banner)
- **tsx** - TypeScript execution for development
- **esbuild** - Fast JavaScript bundler for production builds

**Build & Styling:**
- **vite** & **@vitejs/plugin-react** - Build tooling and React support
- **tailwindcss** & **autoprefixer** - CSS framework and processing
- **postcss** - CSS transformation pipeline

**Type Safety:**
- Shared TypeScript definitions between client and server via `shared/` directory
- Zod schemas for runtime validation and type inference
- Drizzle Zod integration for database schema validation