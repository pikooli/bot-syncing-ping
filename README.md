# Bot Syncing - Ping/Pong System

A blockchain-based ping/pong bot system that monitors smart contract events and automatically responds with pong transactions. This system uses Supabase for data persistence and supports both local development (Anvil) and production environments.

## 🚀 Features

- **Event Monitoring**: Listens for `Ping` events on a smart contract
- **Automatic Response**: Sends `Pong` transactions in response to ping events
- **State Management**: Tracks transaction states using Supabase database
- **Retry Logic**: Handles failed transactions with automatic retries and fee bumping
- **Block Synchronization**: Maintains sync with blockchain state
- **Dual Bot Architecture**: Separate bots for monitoring (botPing) and responding (botPong)

## 📋 Prerequisites

- Node.js 20.x
- Anvil (for local development)
- Supabase account and project
- Ethereum wallet with private key

## 🛠️ Installation

1. Clone the repository:

```bash
git clone https://github.com/pikooli/bot-syncing-ping.git
cd bot-syncing-ping
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
# Create .env file with the following variables:
RCP_HTTP=your_rpc_endpoint
PRIVATE_KEY=your_wallet_private_key
CONTRACT_ADDRESS=deployed_contract_address
SUPABASE_URL=your_supabase_url
SUPABASE_SECRET_KEY=your_supabase_secret_key
START_BLOCK=starting_block_number
```

## 🏗️ Database Setup

The system requires two Supabase tables:

### `storage` table:

```sql
CREATE TABLE storage (
  id SERIAL PRIMARY KEY,
  hash TEXT UNIQUE NOT NULL,
  state TEXT NOT NULL,
  block INTEGER NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  nonce INTEGER,
  attempt INTEGER,
  last_tx_hash TEXT
);
```

### `blockNumber` table:

```sql
CREATE TABLE blockNumber (
  id SERIAL PRIMARY KEY,
  block INTEGER NOT NULL,
  usage TEXT UNIQUE NOT NULL
);
```

## 🚀 Usage

### Development Mode

1. Start Anvil (local blockchain):

```bash
anvil --no-mining --port 8545 --chain-id 31337
```

2. Deploy the contract:

```bash
npm run build
node dist/script/deployContract.js
```

3. Run the bots:

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

## 📜 Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run both bots concurrently
- `npm run botPing` - Run only the ping monitoring bot
- `npm run botPong` - Run only the pong response bot
- `npm run dev` - Build and start both bots
- `npm run test` - Run test script

## 🏗️ Architecture

### BotPing (Event Monitor)

- Listens for `Ping` events on the smart contract
- Maintains blockchain synchronization
- Stores ping events in the database
- Handles block number tracking

### BotPong (Response Bot)

- Processes queued ping events
- Sends `Pong` transactions with transaction hash references
- Implements retry logic with fee bumping
- Updates transaction states in the database

### Smart Contract

The system interacts with a simple ping/pong contract that emits:

- `Ping` event when ping() is called
- `Pong` event when pong(txHash) is called

## 🔧 Development Tools

### ANVIL (Local Blockchain)

```bash
# Start Anvil without mining
anvil --no-mining --port 8545 --chain-id 31337

# Start with custom base fee
anvil --base-fee 1000000000
```

### CAST (Blockchain Interaction)

```bash
# Check current block number
cast block-number

# Mine a block manually
cast rpc anvil_mine

# Set automatic mining interval (1000ms)
cast rpc anvil_setIntervalMining '[1000]'
```

## 🔄 How It Works

1. **Initialization**: BotPing starts by syncing with the blockchain from a specified block
2. **Event Listening**: Continuously monitors for new `Ping` events
3. **Queue Management**: Ping events are queued in the database for processing
4. **Response Processing**: BotPong processes queued events and sends `Pong` transactions
5. **State Tracking**: All transaction states and block numbers are persisted in Supabase
6. **Error Handling**: Failed transactions are retried with increased gas fees

## 🛡️ Error Handling

- **Retry Logic**: Failed transactions are retried up to 3 times
- **Fee Bumping**: Gas fees are automatically increased on retries
- **Alert System**: Critical errors trigger alert notifications
- **State Recovery**: System can resume from the last known good state

## 📊 Monitoring

The system provides comprehensive logging for:

- Event detection and processing
- Transaction status and confirmations
- Error conditions and retries
- Block synchronization progress

## 🔒 Security Considerations

- Private keys should be stored securely
- Use environment variables for sensitive configuration
- Implement proper access controls for Supabase
- Monitor gas fees and wallet balances

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

ISC License - see package.json for details
