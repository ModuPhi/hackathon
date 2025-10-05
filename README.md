# DeFi Giving - ModuPhi

A comprehensive DeFi education platform that combines portfolio management with charitable giving through interactive journeys. Built on Aptos blockchain with Google OAuth integration and keyless wallet technology.

## 🌟 Overview

DeFi Giving is an education-first portfolio application that teaches users about decentralized finance through hands-on experiences. Users can manage their portfolios, participate in lending protocols, and make charitable donations - all while learning about DeFi concepts through guided journeys.

### Key Features

- **🔐 Keyless Authentication**: Google OAuth integration with Aptos keyless wallet technology
- **📊 Portfolio Management**: Real-time portfolio tracking with mock and live data
- **🎯 Interactive Journeys**: Guided learning experiences for DeFi concepts
- **💝 Charitable Giving**: Direct donations to verified nonprofits through smart contracts
- **⛓️ Aptos Integration**: Full blockchain integration with transaction verification
- **📱 Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS

## 🏗️ Architecture

### Frontend (React + TypeScript)

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Context + TanStack Query
- **UI Components**: Radix UI primitives with Tailwind CSS
- **Authentication**: Google OAuth with Aptos keyless wallet

### Backend (Express + TypeScript)

- **API Server**: Express.js with TypeScript
- **Database**: Drizzle ORM with PostgreSQL/Neon
- **Blockchain**: Aptos TypeScript SDK
- **Authentication**: Passport.js with Google OAuth

### Smart Contracts (Move)

- **Language**: Move on Aptos blockchain
- **Modules**:
  - `user_vault`: User fund management and donations
  - `nonprofit_registry`: Verified nonprofit management
  - `receipts`: Transaction receipt tracking
  - `journey_audit`: Journey completion verification
  - `usdc_demo`: Demo USDC token for testing

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20 or higher
- **Aptos CLI** ([Installation Guide](https://aptos.dev/en/build/install-cli))
- **Google OAuth Client** (create via [Google Cloud Console](https://console.cloud.google.com/apis/credentials))

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd DeFiGiving-1
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp ENV.sample .env
   ```

   Configure your `.env` file with:

   ```env
   # Google OAuth
   VITE_GOOGLE_CLIENT_ID=your-google-client-id

   # Aptos Configuration
   VITE_APTOS_NETWORK=testnet
   VITE_APTOS_REST_URL=https://fullnode.testnet.aptoslabs.com/v1

   # Application URLs
   VITE_APP_BASE_URL=http://localhost:5174
   ```

4. **Configure Google OAuth**

   - Create a **Web** OAuth client in Google Cloud Console
   - Add authorized origins: `http://localhost:5173`
   - Add authorized redirect URIs: `http://localhost:5173`
   - Copy the client ID to your `.env` file

5. **Deploy smart contracts** (optional for full functionality)

   ```bash
   # Create deployment config
   cp scripts/deploy.config.sample.json deploy.config.json

   # Deploy to testnet
   npm run deploy -- --config deploy.config.json
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at:

- **Frontend**: http://localhost:5173
- **API**: http://localhost:5174

## 🎮 Usage

### Authentication

1. Click **"Sign in with Google"** on the login screen
2. Complete Google OAuth flow
3. The app automatically creates an Aptos keyless wallet
4. Your wallet address appears in the header

### Portfolio Dashboard

- View your current portfolio balance
- Track lending positions and health factors
- Monitor donation history and receipts

### Interactive Journeys

- **Simple Start**: Basic DeFi concepts and portfolio management
- **Collateral Giving**: Advanced lending and charitable donation strategies

### Making Donations

1. Navigate to a journey that includes donation steps
2. Select a verified nonprofit
3. Choose donation amount
4. Confirm transaction (requires live deployment)
5. View receipt with blockchain verification

## 🔧 Development

### Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   ├── journeys/       # Journey modules
│   │   ├── lib/            # Utilities
│   │   └── pages/          # Page components
├── server/                 # Express backend
│   ├── routes/             # API routes
│   ├── data/               # Static data files
│   └── index.ts            # Server entry point
├── aptos/                  # Move smart contracts
│   ├── sources/            # Move source files
│   └── tests/              # Move tests
└── shared/                 # Shared types and schemas
```

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Testing
npm run test             # Run Vitest tests
npm run check            # TypeScript type checking

# Database
npm run db:push          # Push database schema changes

# Deployment
npm run deploy           # Deploy smart contracts
npm run lint:journeys    # Lint journey modules
```

### Adding New Journeys

1. **Create journey module** in `client/src/journeys/`

   ```typescript
   export default function MyJourney({ isOpen, onClose, auth, keyless, aptos, capabilities, telemetry }) {
     // Journey implementation
   }
   ```

2. **Update journeys manifest** in `server/data/journeys.json`

   ```json
   {
     "slug": "my-journey",
     "title": "My Journey",
     "level": "beginner",
     "enabled": true,
     "importPath": "@/journeys/MyJourney"
   }
   ```

3. **Follow journey contract** - Use injected capabilities and telemetry functions

### Smart Contract Development

```bash
# Run Move tests
aptos move test --skip-fetch-latest-git-deps --named-addresses dg_tenant=<tenant>

# Publish contracts
aptos move publish --named-addresses dg_tenant=<tenant> --assume-yes

# Initialize modules
aptos move run --function <tenant>::usdc_demo::init --assume-yes
```

## 🔌 API Reference

### Authentication Endpoints

- `POST /api/auth/google` - Google OAuth callback
- `POST /api/auth/logout` - User logout

### Portfolio Endpoints

- `GET /api/portfolio` - Get user portfolio
- `PATCH /api/portfolio` - Update portfolio data

### Journey Endpoints

- `GET /api/journeys` - Get available journeys
- `POST /api/journey-runs/start` - Start journey tracking
- `POST /api/journey-runs/complete` - Complete journey
- `GET /api/journey-runs` - Get journey run history

### Blockchain Endpoints

- `POST /api/chain/bootstrap-vault` - Initialize user vault
- `GET /api/verify/:txHash` - Verify transaction on-chain

### Receipt Endpoints

- `GET /api/receipts` - Get user receipts
- `POST /api/receipts` - Create new receipt

## 🧪 Testing

### Frontend Tests

```bash
npm run test
```

### Smart Contract Tests

```bash
cd aptos
aptos move test --skip-fetch-latest-git-deps --named-addresses dg_tenant=<tenant>
```

### Journey Linting

```bash
npm run lint:journeys
```

## 🚀 Deployment

### Smart Contract Deployment

1. **Configure Aptos CLI**

   ```bash
   aptos init --profile tenant --network testnet
   ```

2. **Create deployment config**

   ```bash
   cp scripts/deploy.config.sample.json deploy.config.json
   ```

3. **Deploy contracts**
   ```bash
   npm run deploy -- --config deploy.config.json
   ```

### Application Deployment

1. **Build the application**

   ```bash
   npm run build
   ```

2. **Set production environment variables**

   - Update `VITE_APP_BASE_URL` to production URL
   - Configure production Google OAuth client
   - Set `NODE_ENV=production`

3. **Start production server**
   ```bash
   npm start
   ```

## 📚 Documentation

- [Journeys Manifest](./JOURNEYS_MANIFEST.md) - Journey system documentation
- [Move Deployment Guide](./MOVE_DEPLOY.md) - Smart contract deployment
- [Feature Assessments](./FeatureAssessment.4.0.0.md) - Current feature status
- [Keyless Notes](./KEYLESS_NOTES.md) - Authentication implementation details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Update documentation for API changes
- Use conventional commit messages
- Ensure all journeys follow the established contract

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Aptos Labs](https://aptoslabs.com/) for blockchain infrastructure
- [Google Cloud](https://cloud.google.com/) for OAuth services
- [Radix UI](https://www.radix-ui.com/) for accessible component primitives
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling

## 📞 Support

For support and questions:

- Create an issue in the repository
- Check the documentation in the `/docs` folder
- Review the feature assessments for current status

---

**Built with ❤️ for DeFi education and charitable giving**
