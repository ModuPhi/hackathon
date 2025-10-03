# DeFi Giving - Educational Portfolio Application

## Overview

DeFi Giving is a hands-on educational platform designed to teach users about DeFi concepts through real transactions and interactive portfolio management. This white-label platform is branded for financial advisors and money managers, enabling their clients to learn cryptocurrency fundamentals using real capital ($1,000 starting amount) in a controlled learning environment.

Users learn about cryptocurrency operations like swapping, lending, borrowing, and donating to nonprofits through guided "Effects" - educational flows that use real DeFi protocols. The goal is twofold: master cryptocurrency processes and generate returns for chosen nonprofits.

The application emphasizes plain English explanations over technical jargon, providing step-by-step guidance through complex financial operations with immediate visual feedback and clear validation messages.

**Learning with Real Money:**
- Users start with $1,000 in capital (not demo credits)
- Limited exposure: worst case is $1,000 capital loss, best case is generating returns beyond initial investment
- All transactions use real DeFi protocols from companies like Aave and Aptos

**Effects are branded educational experiences sponsored by crypto companies:**
- **Intro Effect**: "Welcome to DeFi Giving" - Platform introduction explaining the real-money learning approach
  - 4-screen educational flow covering platform overview, limited exposure concept, and learning goals
  - Explains $1,000 starting capital and worst/middle/best case scenarios
  - No transactions - purely educational
- **Effect B (Beginner)**: "Buy Your First Token" - Powered by Aptos - teaches simple token purchase
- **Effect A (Intermediate)**: "Collateralized Borrowing" - Powered by Aave - teaches asset-backed lending
  - Aave-branded educational content throughout the flow
  - Interactive LTV slider (0-100% visual range, enforced 80% max) with real-time health factor updates
  - Comprehensive success screen explaining DeFi lending concepts and user accomplishments

**Effect Completion Tracking:**
- Completed effects show with green background (`bg-success/5`) and green border (`border-success`)
- Buttons change to outline variant with "Completed ✓" text
- Individual effect completion tracked in `completedEffects` JSON array (['intro', 'effect-a', 'effect-b'])
- Users can still click completed effects to review content

**Portfolio Dashboard Features:**
- **4-Card Summary Row** with info popovers:
  - Cash Available (USD capital ready to allocate)
  - Invested Assets (crypto holdings value)
  - Commitments (borrowed amounts, muted when zero)
  - Donated to Causes (cumulative donations, highlighted)
- Health Factor and technical debt metrics moved out of surface UI for simplicity
- Each card includes ⓘ icon with plain-English explanations in accessible popovers
- Smooth 200ms animations on value changes
- Responsive: 4-column on desktop, 2x2 grid on mobile

**Dashboard Layout (top to bottom):**
1. Balance Cards section with portfolio summary
2. Effects Board for choosing educational flows
3. Nonprofit selection button
4. Motivational section with heading "This is who you're playing for" and descriptive text framing crypto as a challenge
5. Grid layout (3 columns on desktop):
   - Left (1/3): Selected nonprofit card with photo, location, description
   - Right (2/3): Donation Receipts table showing transaction history

**Nonprofit Selection:**
- Single-select design (1 nonprofit only, not multiple)
- Kiva-style card design with photos, locations, descriptions, and categories
- Dialog shows "Choose a nonprofit to support" with selection interface
- Selected nonprofit displayed as card on dashboard
- Button text changes to show selected nonprofit name
- Effects are enabled once a nonprofit is selected

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
- `portfolios` - User financial state (credits, USDC, APT, debt, health factor) + `selectedNonprofit` text field (single nonprofit ID) + `completedEffects` JSON array (['intro', 'effect-a', 'effect-b'])
- `receipts` - Transaction history for Effects (renamed to "Donation Receipts" in UI)
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