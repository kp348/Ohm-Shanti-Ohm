# Blockchain-Integrated AQI Monitor

This project implements a decentralized environmental monitoring system that bridges the gap between IoT hardware and blockchain technology. By logging real-time Air Quality Index (AQI) data onto an immutable ledger, it provides a "Trust-as-a-Service" layer for auditable and transparent environmental compliance.

---

# PROJECT OVERVIEW

The system captures atmospheric data through a distributed network of IoT sensors, processes it via a robust backend, and secures the metrics using Ethereum-based smart contracts. This ensures that environmental data remains tamper-proof, providing a reliable source of truth for regulatory bodies and the public.

- Real-time Aggregation: Architected a robust backend infrastructure to aggregate data from distributed IoT sensors via Node.js.
- Immutable Records: Engineered a decentralized layer using Ethereum-based smart contracts to log environmental metrics onto a blockchain ledger.
- High Availability: Ensured seamless data flow and high-availability processing for mission-critical monitoring.

---

# TECH STACK

## Hardware

- Microcontrollers: ESP32-WROOM-32 / ESP8266
- Sensors: MQ-series Gas Sensors (MQ-135, MQ-7), PM2.5 Sensors
- Peripherals: ADS1115 ADC for precision, RS-485 Communication, NRF24L01 Wireless Modules
- Design: Custom 2-layer IoT Data Acquisition PCB

## Software & Blockchain

- Backend: Node.js and Express.js
- Database: Firebase Realtime Database / Firestore
- Hosting: Render
- Blockchain: Solidity Smart Contracts and Ethers.js
- Network: Sepolia / Polygon Amoy Testnets
- Infrastructure: Alchemy / Infura APIs

---

# KEY FEATURES

- Decentralized Trust: Removes the need for a centralized authority to verify environmental compliance.
- Audit Trail: Every data point is timestamped and signed, creating a permanent, auditable history of air quality.
- Scalable Architecture: Designed to handle multiple distributed IoT nodes across industrial environments.
- Custom Firmware: Programmed core logic for sensor calibration, data acquisition, and secure data transmission.
- Cloud Integration: Sensor data is securely transferred through Render backend services into Firebase.
- Blockchain Verification: AQI records are validated and stored immutably on blockchain networks.

---

# REPOSITORY STRUCTURE

```text
├── hardware/           # Firmware (C++/Arduino), PCB Schematics & Wiring Diagrams
├── blockchain/         # Solidity Smart Contracts, Deployment Scripts & ABIs
├── backend/            # Node.js Server, API routes, Firebase & Blockchain integration
├── database/           # Firebase configuration and cloud functions
└── docs/               # Technical documentation and project materials
```

---

# SETUP & INSTALLATION

## 1. Prerequisites

Make sure the following are installed:

- Node.js v16.x or higher
- Arduino IDE / PlatformIO
- MetaMask Wallet
- Alchemy or Infura API Key
- Firebase Project Setup

---

## 2. Backend Installation

```bash
# Clone the repository
git clone https://github.com/your-username/aqi-blockchain-monitor.git

# Navigate to backend directory
cd aqi-blockchain-monitor/backend

# Install dependencies
npm install
```

---

## 3. Smart Contract Deployment

1. Navigate to the `/blockchain` directory.
2. Deploy `AQIMonitor.sol` using Hardhat or Remix IDE.
3. Deploy to Sepolia or Polygon Amoy testnet.
4. Save the deployed contract address and ABI.

---

## 4. Firebase Configuration

Create a Firebase project and enable:

- Firebase Realtime Database or Firestore
- Authentication (optional)
- Hosting (optional)

Add Firebase credentials to your backend.

Example:

```env
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_DATABASE_URL=your_database_url
FIREBASE_PROJECT_ID=your_project_id
```

---

## 5. Environment Configuration

Create a `.env` file inside `/backend`:

```env
PORT=3000

PRIVATE_KEY=your_wallet_private_key

RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_api_key

CONTRACT_ADDRESS=0xYourDeployedContractAddress

BACKEND_URL=https://your-render-backend-url.onrender.com
```

---

## 6. Hardware Setup

1. Open the `.ino` sketch from the `/hardware` folder.
2. Update:
   - WIFI_SSID
   - WIFI_PASSWORD
   - BACKEND_URL
3. Connect sensors to ESP32:
   - MQ-135
   - MQ-7
   - PM2.5 Sensor
4. Use ADS1115 ADC if higher analog precision is required.
5. Flash the firmware to ESP32.

---

# USAGE

## Start Backend Server

```bash
npm start
```

---

## Data Flow

1. ESP32 collects AQI sensor data.
2. Data is transmitted to the backend hosted on Render.
3. Backend validates and stores data in Firebase.
4. Smart contracts initialize blockchain transactions.
5. AQI records become immutable and publicly verifiable.

---

# SYSTEM ARCHITECTURE

```text
Sensors → ESP32 → Render Backend → Firebase Database → Blockchain Network
```

---

# BLOCKCHAIN INTEGRATION

The project uses Solidity smart contracts to securely store AQI records on-chain.

Each transaction contains:
- Timestamp
- Sensor ID
- AQI Metrics
- Verification Hash

This ensures:
- Tamper-proof storage
- Transparency
- Data authenticity
- Environmental auditability


