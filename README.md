# Trade Bridge Service

A TypeScript-based microservice for executing cross-chain token bridges using the LI.FI protocol. This service handles token bridging operations with automatic monitoring, retry mechanisms, and status tracking.

## Features

- Cross-chain token bridging via LI.FI protocol
- Automatic transaction monitoring and status updates
- Configurable slippage protection (default 0.5%, max 3%)
- Automatic retry mechanism for failed operations (up to 3 retries)
- Transaction status persistence with PostgreSQL
- RESTful API endpoints for bridge operations

## Quick Start

1. Clone the repository

2. Create `.env` file:
PRIVATE_KEY=PRIVATE_KEY

3. Run with Docker:
```
docker-compose up
```

Service will be running at `http://localhost:3000`

## API Endpoints

### Start Bridge
```
POST /api/bridge
{
"toChainId": 5000, // To MANTLE
"fromAmount": "1000000",
"toAddress": "0x..." // Destination wallet
"slippage": 0.005 // Optional, default 0.5%
"coinId": "USDC"
}
```

### Check Status
```
GET /api/bridge/:executionId
```
