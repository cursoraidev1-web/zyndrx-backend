const { EmailService } = require('./dist/utils/email.service');
const { config } = require('./dist/config');

async function sendTestEmail() {
  try {
    const toEmail = config.email.fromAddress.match(/<([^>]+)>/)?.[1] || config.email.fromAddress;
    console.log(`Attempting to send test email to: ${toEmail}`);
    console.log(`Using Resend API Key: ${config.email.resendApiKey ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`From Address: ${config.email.fromAddress}`);
    
    if (!config.email.resendApiKey) {
      console.error('❌ RESEND_API_KEY is not configured in your .env file');
      console.log('Please add: RESEND_API_KEY=re_your_api_key_here');
      process.exit(1);
    }

    if (!config.email.fromAddress) {
      console.error('❌ EMAIL_FROM is not configured in your .env file');
      console.log('Please add: EMAIL_FROM=Name <email@yourdomain.com>');
      process.exit(1);
    }

    await EmailService.sendTestEmail(
      toEmail,
      "Hello from Zyndrx Resend",
      "<strong>Hello</strong> dear Zyndrx user. This is a test email from your Resend integration."
    );
    console.log('✅ Test email sent successfully!');
    console.log('📧 Check your inbox (and spam folder) for the test email.');
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    if (error.message?.includes('domain') || error.message?.includes('Domain')) {
      console.log('\n💡 Tip: Make sure you have verified your domain in Resend.');
      console.log('   Go to: https://resend.com/domains');
      console.log('   Add and verify your domain, then try again.');
    }
    if (error.response) {
      console.error('Resend API response:', error.response.data);
    }
    process.exit(1);
  }
}

sendTestEmail();
