const { google } = require('googleapis');
const path = require('path');

const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), 'google_credentials.json'),
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  
  // set auth as a global default
  google.options({
    auth: auth
  });

  const gdrive = google.drive({
    version: 'v3',
    auth: auth
  });

module.exports = { gdrive, auth };