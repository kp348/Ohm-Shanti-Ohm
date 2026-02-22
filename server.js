const express = require('express');
const admin = require('firebase-admin');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// --- CONFIG & SECRETS ---
const { PRIVATE_KEY, ALCHEMY_RPC_URL, CONTRACT_ADDRESS, FIREBASE_DB_URL } = process.env;

// --- FIREBASE SETUP ---
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: FIREBASE_DB_URL
});

const realtimeDB = admin.database();
const firestoreDB = admin.firestore();

// --- BLOCKCHAIN SETUP ---
const provider = new ethers.JsonRpcProvider(ALCHEMY_RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contractABI = ["function logFullReport(uint256 _concentration, uint256 _r1, uint256 _r2, uint256 _r3, string memory _action) public"];
const aqContract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

// --- ⭐ STATE TRACKING (To save Gas) ---
let lastKnownSafeState = true; 
const ALERT_THRESHOLD = 100; // Trigger blockchain only when crossing this line

app.post('/api/data', async (req, res) => {
    try {
        const { aqiScore, action, highestConcentration } = req.body;
        const isCurrentlySafe = aqiScore < ALERT_THRESHOLD;
        const timestamp = Date.now();

        console.log(`\n[DATA RECEIVED] AQI: ${aqiScore} | Pollutant: ${action}`);

        // STEP A: Realtime Database (Instant dashboard update)
        const newLogRef = realtimeDB.ref('aqi_history').push();
        await newLogRef.set({
            aqiScore, action, highestConcentration, timestamp, verified: false
        });

        // STEP B: Firestore (Mobile app update)
        const firestoreRef = await firestoreDB.collection("sensorData").add({
            aqi: aqiScore,
            criticalGas: action,
            concentration: highestConcentration,
            fanStatus: aqiScore > ALERT_THRESHOLD ? "ON" : "OFF",
            blockchain: "Pending",
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // STEP C: Blockchain Logic (Trigger only on state change)
        if (isCurrentlySafe !== lastKnownSafeState) {
            console.log("🔗 Threshold Change! Initializing Blockchain Log...");
            
            const eventLabel = isCurrentlySafe ? "RECOVERY" : "CRITICAL ALERT";
            const reportText = `${eventLabel}: AQI ${aqiScore} | Source: ${action}`;

            const tx = await aqContract.logFullReport(
                Math.round(highestConcentration), 0, 0, 0, reportText
            );
            const receipt = await tx.wait();
            
            // STEP D: Update Proof in both DBs
            await newLogRef.update({ txHash: receipt.hash, verified: true });
            await firestoreRef.update({ blockchain: "Logged", txHash: receipt.hash });

            console.log(`💎 Blockchain Verified: ${receipt.hash}`);
            lastKnownSafeState = isCurrentlySafe; // Update tracker
        }

        res.status(200).send({ status: "Processed", thresholdTriggered: isCurrentlySafe !== lastKnownSafeState });

    } catch (error) {
        console.error("❌ Error:", error.message);
        res.status(500).send({ status: "Error", message: error.message });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Bridge Server live on port ${PORT}`);
});