// Quick test script for Postmark email
// Run with: node test-postmark.js

const { ServerClient } = require('postmark');

// Your Postmark configuration
const API_KEY = 'c1ba6a8e-f826-4379-bdb5-2a7485a20d46';
const FROM_EMAIL = 'iyiola.ogunjobi@mckodev.com.ng';
const TO_EMAIL = 'iyiola.ogunjobi@mckodev.com.ng';
const MESSAGE_STREAM = 'allzyndrx';

// Create Postmark client
const client = new ServerClient(API_KEY);

// Send test email
async function sendTestEmail() {
  try {
    console.log('Sending test email...');
    console.log('From:', FROM_EMAIL);
    console.log('To:', TO_EMAIL);
    console.log('MessageStream:', MESSAGE_STREAM);

    const result = await client.sendEmail({
      From: FROM_EMAIL,
      To: TO_EMAIL,
      Subject: 'Hello from Postmark',
      HtmlBody: '<strong>Hello</strong> dear Postmark user.',
      TextBody: 'Hello from Postmark!',
      MessageStream: MESSAGE_STREAM
    });

    console.log('\n✅ Email sent successfully!');
    console.log('Message ID:', result.MessageID);
    console.log('Submitted At:', result.SubmittedAt);
    console.log('To:', result.To);
  } catch (error) {
    console.error('\n❌ Failed to send email:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
  }
}

sendTestEmail();

