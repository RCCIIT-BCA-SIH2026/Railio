import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { whatsappSessionManager } from '../services/whatsappSessionManager';

async function runTests() {
  console.log('=======================================================');
  console.log('🧪 Testing RailIo Meta WhatsApp Cloud API Integration');
  console.log('=======================================================');

  const testPhone = '+15556783260';

  console.log('\n--- Test 1: User sends "Hi" (Greeting / Main Menu) ---');
  await whatsappSessionManager.processIncomingMessage(testPhone, 'Hi');

  console.log('\n--- Test 2: User taps "🎯 Can I Catch Train?" button ---');
  await whatsappSessionManager.processIncomingMessage(testPhone, 'Can I Catch Train', 'btn_catch_train');

  console.log('\n--- Test 3: User replies with Train "32216" and shares Location ---');
  await whatsappSessionManager.processIncomingMessage(
    testPhone,
    '32216',
    undefined,
    { latitude: 22.5726, longitude: 88.3639, name: 'Esplanade Metro Kolkata' }
  );

  console.log('\n--- Test 4: User asks for Suburban Local Timetable ---');
  await whatsappSessionManager.processIncomingMessage(testPhone, 'Suburban', 'btn_suburban');

  console.log('\n✅ All WhatsApp integration tests completed successfully!');
}

runTests().catch((err) => console.error('Test error:', err));
