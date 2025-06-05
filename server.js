const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/api/stalk', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username diperlukan.' });

  try {
    const response = await fetch(`https://api.siputzx.my.id/api/stalk/instagram?username=${username}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data dari API.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
