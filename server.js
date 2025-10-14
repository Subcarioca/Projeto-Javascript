const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Serve os arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint para obter as músicas da primeira playlist
app.get('/api/songs', (req, res) => {
  fs.readFile(path.join(__dirname, 'db.json'), 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Erro ao ler o banco de dados.');
      return;
    }
    const db = JSON.parse(data);
    res.json(db.playlists[0].songs); // Retorna apenas a primeira playlist por padrão
  });
});

// NOVO: Endpoint para obter todas as playlists
app.get('/api/playlists', (req, res) => {
  fs.readFile(path.join(__dirname, 'db.json'), 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Erro ao ler o banco de dados.');
      return;
    }
    const db = JSON.parse(data);
    const playlists = db.playlists.map(p => ({ name: p.name, songs: p.songs }));
    res.json(playlists);
  });
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});