const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Rate limiting simulation (simple in-memory store)
const rateLimitMap = new Map();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(ip) || [];
  
  // Remove old requests
  const recentRequests = userRequests.filter(time => now - time < RATE_WINDOW);
  
  if (recentRequests.length >= RATE_LIMIT) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
}

// Input validation
function validateUsername(username) {
  // Instagram username rules: 1-30 characters, letters, numbers, periods, underscores
  const regex = /^[a-zA-Z0-9._]{1,30}$/;
  return regex.test(username);
}

app.get('/api/stalk', async (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Rate limiting
  if (!checkRateLimit(clientIP)) {
    return res.status(429).json({ 
      status: false,
      error: 'Terlalu banyak permintaan. Coba lagi dalam 1 menit.' 
    });
  }

  const { username } = req.query;
  
  // Input validation
  if (!username) {
    return res.status(400).json({ 
      status: false,
      error: 'Username diperlukan.' 
    });
  }
  
  if (!validateUsername(username)) {
    return res.status(400).json({ 
      status: false,
      error: 'Username tidak valid. Gunakan 1-30 karakter (huruf, angka, titik, underscore).' 
    });
  }

  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(
      `https://api.siputzx.my.id/api/stalk/instagram?username=${encodeURIComponent(username)}`,
      { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'Instagram-Profile-Viewer/1.0'
        }
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API returned status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validate API response structure
    if (data.status === true && data.result) {
      // Sanitize data before sending to client
      const sanitizedResult = {
        username: data.result.username || '',
        fullname: data.result.fullname || '',
        followers: parseInt(data.result.followers) || 0,
        following: parseInt(data.result.following) || 0,
        post: parseInt(data.result.post) || 0,
        bio: data.result.bio || '',
        profile_pic_url: data.result.profile_pic_url || '',
        is_private: data.result.is_private || false,
        is_verified: data.result.is_verified || false
      };
      
      res.json({
        status: true,
        result: sanitizedResult
      });
    } else {
      res.json({
        status: false,
        error: 'Username tidak ditemukan atau profil tidak dapat diakses.'
      });
    }
    
  } catch (err) {
    console.error('API Error:', err.message);
    
    if (err.name === 'AbortError') {
      res.status(408).json({ 
        status: false,
        error: 'Permintaan timeout. Coba lagi nanti.' 
      });
    } else {
      res.status(500).json({ 
        status: false,
        error: 'Gagal mengambil data. Silakan coba lagi nanti.' 
      });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Terjadi kesalahan server.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
