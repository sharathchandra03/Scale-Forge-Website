const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3000;

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwIAuU40eWiudcykr_oeFkG1zuk18_5WDJvxPme3dCnHDtLkrM4X1jg75DWjmtsEEb-/exec';

app.use(cors());
app.use(express.json());

// Serve .splinecode with correct MIME type + range support for video textures
app.use(express.static(__dirname, {
  setHeaders(res, filePath) {
    if (path.extname(filePath) === '.splinecode') {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

app.get('/blog', (req, res) => res.sendFile(path.join(__dirname, 'blog.html')));
app.get('/blog/:slug', (req, res) => res.sendFile(path.join(__dirname, 'blog.html')));

app.post('/submit', async (req, res) => {
  try {
    const { name, businessName, email, phone, service, budget, goals } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Name, email and phone are required.' });
    }

    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const params = new URLSearchParams({ timestamp, name, businessName: businessName || '', email, phone, service: service || '', budget: budget || '', goals: goals || '' });
    await fetch(GOOGLE_SCRIPT_URL + '?' + params.toString(), { redirect: 'follow' });

    console.log(`✅ Lead saved to Google Sheets: ${name} (${email}) at ${timestamp}`);
    res.json({ success: true, message: 'Lead saved to Google Sheets.' });

  } catch (err) {
    console.error('❌ Error saving lead:', err.message);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 S&C Lead Server running at http://localhost:${PORT}`);
    console.log(`📊 Google Sheets: ${GOOGLE_SCRIPT_URL}\n`);
  });
}

module.exports = app;
