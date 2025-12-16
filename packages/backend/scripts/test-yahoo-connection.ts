import Imap from 'imap';
import * as dotenv from 'dotenv';

dotenv.config();

async function testYahooConnection() {
  const yahooEmail = process.env.YAHOO_EMAIL;
  const yahooPassword = process.env.YAHOO_APP_PASSWORD;
  const imapHost = process.env.YAHOO_IMAP_HOST || 'imap.mail.yahoo.com';
  const imapPort = parseInt(process.env.YAHOO_IMAP_PORT || '993');

  if (!yahooEmail || !yahooPassword) {
    console.error('❌ Yahoo credentials not found in .env file');
    console.error('');
    console.error('Please add to packages/backend/.env:');
    console.error('  YAHOO_EMAIL=your-email@yahoo.com');
    console.error('  YAHOO_APP_PASSWORD=your-16-char-app-password');
    console.error('');
    console.error('Get app password from: https://login.yahoo.com/account/security');
    process.exit(1);
  }

  console.log('🔄 Testing Yahoo IMAP connection...');
  console.log(`   Email: ${yahooEmail}`);
  console.log(`   Host: ${imapHost}:${imapPort}`);
  console.log('');

  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: yahooEmail,
      password: yahooPassword,
      host: imapHost,
      port: imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    imap.once('ready', () => {
      console.log('✅ Successfully connected to Yahoo IMAP!');
      console.log('');

      // Open INBOX to test
      imap.openBox('INBOX', true, (err, box) => {
        if (err) {
          console.error('❌ Error opening INBOX:', err.message);
          imap.end();
          reject(err);
          return;
        }

        console.log('📬 INBOX Information:');
        console.log(`   Total messages: ${box.messages.total}`);
        console.log(`   New messages: ${box.messages.new}`);
        console.log(`   Unseen messages: ${box.messages.unseen}`);
        console.log('');

        // List all mailboxes
        imap.getBoxes((err, boxes) => {
          if (err) {
            console.error('❌ Error listing mailboxes:', err.message);
          } else {
            console.log('📁 Available mailboxes:');
            Object.keys(boxes).forEach(name => {
              console.log(`   - ${name}`);
            });
            console.log('');
          }

          console.log('✅ Yahoo IMAP connection test successful!');
          console.log('');
          console.log('Next steps:');
          console.log('1. Add account to database: npm run add:yahoo');
          console.log('2. Test email sync: npm run test:yahoo-sync');

          imap.end();
          resolve(true);
        });
      });
    });

    imap.once('error', (err: Error) => {
      console.error('❌ IMAP connection error:', err.message);
      console.error('');
      console.error('Common issues:');
      console.error('1. Wrong email or app password');
      console.error('2. App password not generated (must use app password, not regular password)');
      console.error('3. IMAP access not enabled in Yahoo settings');
      console.error('');
      console.error('Get app password from: https://login.yahoo.com/account/security');
      reject(err);
    });

    imap.once('end', () => {
      console.log('🔌 Connection closed');
    });

    imap.connect();
  });
}

testYahooConnection()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
