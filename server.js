// Arquivo: server.js (Refatorado para SQLite)

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000;

// Configuração do Banco de Dados SQLite
const dbPath = path.resolve(__dirname, 'music.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
  }
});


// Serve os arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));


// Lógica para agrupar as músicas por playlist (função auxiliar)
function groupSongsByPlaylist(rows) {
    const playlistsMap = {};
    let currentPlaylistId = null;
    let playlistIndex = 0;

    rows.forEach(row => {
        // Se a playlist for nova, crie a entrada no mapa
        if (row.playlist_id !== currentPlaylistId) {
            currentPlaylistId = row.playlist_id;
            playlistsMap[row.playlist_name] = {
                name: row.playlist_name,
                songs: []
            };
        }
        
        // Adicionar a música, garantindo que o nome do campo seja 'song' (para o frontend)
        playlistsMap[row.playlist_name].songs.push({
            id: row.song_id.toString(), // O frontend espera string
            name: row.name,
            artist: row.artist,
            cover: row.cover,
            song: row.song_path, // Mapeado de volta para 'song'
            genre: row.genre,
            bpm: row.bpm
        });
    });

    return Object.values(playlistsMap);
}


// Endpoint para obter todas as playlists (principalmente usado pelo frontend)
app.get('/api/playlists', (req, res) => {
  // Consulta SQL: JOIN para ligar playlists e músicas, ordenado para facilitar o agrupamento
  const sql = `
    SELECT p.playlist_id, p.name AS playlist_name, s.* FROM playlists p
    JOIN songs s ON p.playlist_id = s.playlist_id
    ORDER BY p.playlist_id, s.song_id
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Erro interno ao consultar o banco de dados.' });
      return;
    }
    
    // Transformar a lista plana de linhas SQL no JSON aninhado que o frontend espera
    const playlistsArray = groupSongsByPlaylist(rows);
    res.json(playlistsArray);
  });
});

// Endpoint para obter as músicas da primeira playlist (mantido por compatibilidade com a rota antiga /api/songs)
app.get('/api/songs', (req, res) => {
    const sql = `
        SELECT s.* FROM songs s
        WHERE s.playlist_id = (SELECT MIN(playlist_id) FROM playlists)
        ORDER BY s.song_id
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Formatar as músicas no objeto esperado
        const songs = rows.map(s => ({
            id: s.song_id.toString(),
            name: s.name,
            artist: s.artist,
            cover: s.cover,
            song: s.song_path,
            genre: s.genre,
            bpm: s.bpm
        }));

        res.json(songs);
    });
});


app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
