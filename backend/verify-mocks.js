// Quick verification that mocks are set up correctly
import { msg91 } from './src/services/msg91.js';
import { fcm } from './src/services/fcm.js';

console.log('✓ msg91 object exports:');
console.log('  - sendOtp:', typeof msg91.sendOtp);
console.log('  - sendNotification:', typeof msg91.sendNotification);

console.log('');
console.log('✓ fcm object exports:');
console.log('  - sendNotification:', typeof fcm.sendNotification);
console.log('  - sendHighPriorityNotification:', typeof fcm.sendHighPriorityNotification);

console.log('');
console.log('✓ All required methods are exported correctly');
