import { sendBusinessNotification, sendBuyerInvoice } from './services/email.service.js';
import config from './config/index.js';

/**
 * Test script for email functionality.
 */
const testEmailFunctionality = async () => {
  console.log('Starting email functionality test...');

  // Test data
  const testOrder = {
    reference: 'TEST-001',
    metadata: {
      customer_name: 'John Doe',
      customer_email: config.emailConfig.from,
      customer_phone: '123-456-7890',
      shipping_address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        postalCode: '12345',
        country: 'Testland',
      },
      cart_items: [
        {
          name: 'Test Product',
          quantity: 2,
          price: 5000,
        },
        {
          name: 'Another Product',
          quantity: 1,
          price: 15000,
        },
      ],
    },
    amount: 25000,
    name: 'TEST-001',
    channel: 'test',
    paid_at: new Date().toISOString(),
  };

  try {
    console.log('Testing business notification email...');
    await sendBusinessNotification(testOrder);
    console.log('Business notification email test successful!');
  } catch (error) {
    console.error('Business notification email test failed:', error);
  }

  try {
    console.log('Testing buyer invoice email...');
    await sendBuyerInvoice(testOrder);
    console.log('Buyer invoice email test successful!');
  } catch (error) {
    console.error('Buyer invoice email test failed:', error);
  }

  console.log('Email functionality test completed!');
};

// Run the test
testEmailFunctionality().catch(console.error);