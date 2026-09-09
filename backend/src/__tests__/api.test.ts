import express from 'express';
import http from 'http';
import axios from 'axios';
import apiRouter from '../routes/api';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiRouter);

const server = http.createServer(app);
const TEST_PORT = 5098;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting RailIo Backend Automated Test Suite');
  console.log('====================================================');

  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => resolve());
  });

  let passed = 0;
  let failed = 0;

  try {
    // 1. Test Auth Login
    try {
      const res = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'passenger@railio.ai',
        password: 'password123',
        role: 'PASSENGER',
      });
      if (res.data.success && res.data.token) {
        console.log('✅ TEST 1 PASSED: Auth Login & JWT Token generation');
        passed++;
      } else {
        throw new Error('Missing token');
      }
    } catch (err: any) {
      console.error('❌ TEST 1 FAILED: Auth Login', err.message);
      failed++;
    }

    // 2. Test Train Search (Sealdah -> Dankuni)
    try {
      const res = await axios.get(`${BASE_URL}/trains?from=SDAH&to=DKAE`);
      if (res.data.success && res.data.trains.length > 0) {
        console.log(`✅ TEST 2 PASSED: Train Search returned ${res.data.trains.length} trains (SDAH -> DKAE)`);
        passed++;
      } else {
        throw new Error('No trains returned');
      }
    } catch (err: any) {
      console.error('❌ TEST 2 FAILED: Train Search', err.message);
      failed++;
    }

    // 3. Test Live Train Telemetry (Train 32211)
    try {
      const res = await axios.get(`${BASE_URL}/trains/32211/live`);
      if (res.data.success && res.data.liveState && res.data.liveState.speed !== undefined) {
        console.log(`✅ TEST 3 PASSED: Live Train Telemetry for 32211 (Speed: ${res.data.liveState.speed} km/h, Delay: +${res.data.liveState.delayMinutes}m)`);
        passed++;
      } else {
        throw new Error('Invalid live state payload');
      }
    } catch (err: any) {
      console.error('❌ TEST 3 FAILED: Live Train Telemetry', err.message);
      failed++;
    }

    // 4. Test "Can I Catch My Train?"
    try {
      const res = await axios.post(`${BASE_URL}/catch-probability`, {
        trainNumber: '32216',
        roadDistanceKm: 5,
        trafficCondition: 'MODERATE',
        stationEntryBufferMin: 7,
      });
      if (res.data.success && res.data.data.catchProbabilityPct !== undefined) {
        console.log(`✅ TEST 4 PASSED: Can I Catch My Train? (Probability: ${res.data.data.catchProbabilityPct}%, Rec: "${res.data.data.recommendation.substring(0, 30)}...")`);
        passed++;
      } else {
        throw new Error('Invalid catch probability response');
      }
    } catch (err: any) {
      console.error('❌ TEST 4 FAILED: Can I Catch My Train?', err.message);
      failed++;
    }

    // 5. Test Digital Twin Precedence Simulator (Suburban EMU scenario)
    try {
      const res = await axios.post(`${BASE_URL}/digital-twin/simulate`, {
        scenario: 'PEAK_EMU_PRECEDENCE',
        trainNumber: '32216',
      });
      if (res.data.success && res.data.simulation) {
        console.log(`✅ TEST 5 PASSED: Digital Twin What-If Precedence Simulation (Net Delay: ${res.data.simulation.netNetworkDelayMinutes || res.data.simulation.netNetworkDelayChangeMin}m)`);
        passed++;
      } else {
        throw new Error('Invalid simulation response');
      }
    } catch (err: any) {
      console.error('❌ TEST 5 FAILED: Digital Twin Simulation', err.message);
      failed++;
    }

    // 6. Test Track Risk & Telemetry Ingestion
    try {
      const res = await axios.get(`${BASE_URL}/track/risk`);
      if (res.data.success && res.data.sections.length > 0) {
        console.log(`✅ TEST 6 PASSED: Track Anomaly & Health Monitor (${res.data.sections.length} monitored sections)`);
        passed++;
      } else {
        throw new Error('Invalid track risk response');
      }
    } catch (err: any) {
      console.error('❌ TEST 6 FAILED: Track Risk API', err.message);
      failed++;
    }

    // 7. Test Dakshineswar-Sealdah Suburban Local Upcoming Trains
    try {
      const res = await axios.get(`${BASE_URL}/suburban/upcoming?from=DAKE&to=SDAH&time=06:00`);
      if (res.data.success && res.data.trains && res.data.trains.length > 0) {
        const first = res.data.trains[0];
        console.log(`✅ TEST 7 PASSED: Suburban Local Search DAKE -> SDAH (Found ${res.data.trains.length} upcoming locals, Next: Train #${first.trainNumber} in ${first.minutesUntilDeparture}m, Best Coach: ${first.recommendedCoach})`);
        passed++;
      } else {
        throw new Error('No suburban trains returned for DAKE -> SDAH');
      }
    } catch (err: any) {
      console.error('❌ TEST 7 FAILED: Suburban Local Search', err.message);
      failed++;
    }

    // 8. Test Google Maps-Style Cellular Coach Crowd Telemetry (12 Coaches)
    try {
      const res = await axios.get(`${BASE_URL}/suburban/crowd-telemetry/32216`);
      if (res.data.success && res.data.telemetry?.coaches?.length === 12) {
        console.log(`✅ TEST 8 PASSED: Google Maps Cellular Crowd Telemetry (12 Coaches, Best Coach: ${res.data.telemetry.recommendedCoach}, Tracked: ${res.data.telemetry.telemetryStats?.totalTrackedDevices} Phones)`);
        passed++;
      } else {
        throw new Error('Invalid coach telemetry response');
      }
    } catch (err: any) {
      console.error('❌ TEST 8 FAILED: Coach Crowd Telemetry', err.message);
      failed++;
    }

    console.log('====================================================');
    console.log(`🎉 TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');
  } finally {
    server.close();
  }
}

if (require.main === module) {
  runTests();
}

export { runTests };
