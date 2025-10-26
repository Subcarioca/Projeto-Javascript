const UIElements = {
    body: document.body,
    darkModeToggleDesktop: document.getElementById('dark-mode-toggle-desktop'),
    darkModeToggleMobile: document.getElementById('dark-mode-toggle-mobile'),
    bgLayer1: document.getElementById('bg-layer-1'),
    bgLayer2: document.getElementById('bg-layer-2'),
    coverBg: document.getElementById('cover-bg'),
    coverFg: document.getElementById('cover-fg'),
    compactCover: document.getElementById('compact-cover'),
    songName: document.getElementById('song-name'),
    artistName: document.getElementById('artist-name'),
    audio: document.getElementById('audio'),
    visualizerCanvas: document.getElementById('audio-visualizer'), 
    playButton: document.getElementById('play'),
    playButtonIcon: document.getElementById('play').querySelector('i.bi'),
    prevButton: document.getElementById('previous'),
    nextButton: document.getElementById('next'),
    shuffleButton: document.getElementById('shuffle'),
    repeatButton: document.getElementById('repeat'),
    progressContainer: document.getElementById('progress-container'),
    currentProgress: document.getElementById('current-progress'),
    currentTimeEl: document.getElementById('current-time'),
    totalDurationEl: document.getElementById('total-duration'),
    volumeIcon: document.getElementById('volume-icon'),
    volumeIconItself: document.getElementById('volume-icon').querySelector('i.bi'),
    volumeSlider: document.getElementById('volume-slider'),
    volumePercentage: document.getElementById('volume-percentage'),
    songMenuButton: document.getElementById('song-menu-button'),
    playlistMenuButton: document.getElementById('playlist-menu-button'),
    drawerOverlay: document.getElementById('drawer-overlay'),
    songDrawer: document.getElementById('song-drawer'),
    songList: document.getElementById('song-list'),
    closeSongButton: document.getElementById('close-song-button'),
    playlistDrawer: document.getElementById('playlist-drawer'),
    playlistList: document.getElementById('playlist-list'),
    closePlaylistButton: document.getElementById('close-playlist-button'),
    songMenuButton: document.getElementById('song-menu-button'),
    playlistMenuButton: document.getElementById('playlist-menu-button'),
    curiosityButton: document.getElementById('curiosity-button'),

        // NEW: Elementos de Pesquisa
    searchInput: document.getElementById('search-input'),
    searchButton: document.getElementById('search-button'),
    searchResultsDrawer: document.getElementById('search-results-drawer'),
    searchResultsList: document.getElementById('search-results-list'),
    closeSearchButton: document.getElementById('close-search-button'),
    drawerOverlay: document.getElementById('drawer-overlay'), // Certifique-se que o overlay está referenciado

    // NEW: Player de Áudio Auxiliar para Prévias
    previewAudio: new Audio() // Cria um novo elemento <audio> em JS
};

// Variável para rastrear a URL de prévia atual
let currentPreviewUrl = null;

const colorThief = new ColorThief();
let allPlaylists = [];
let playlist = [];
let currentPlaylistIndex = 0;
let audioCtx;
let analyser;
let source; 
let bufferLength;
let dataArray;
let canvasCtx;
let isVisualizerReady = false;

const playerState = {
    currentSongIndex: 0,
    isPlaying: false,
    isShuffle: false,
    repeatMode: 'off', // 'off', 'all', 'one'
    lastVolume: 0.1,
    isTransitioning: false,
    activeBgLayer: 1,
    isSeeking: false,
    isDarkMode: false,
    currentPalette: [],
};

let pulseInterval;

function startPulse(bpm) {
    clearInterval(pulseInterval);

    if (bpm && bpm > 0) {
        const intervalTime = (60 / bpm) * 1000;
        pulseInterval = setInterval(() => {
            UIElements.body.classList.add('pulse-effect');

            setTimeout(() => {
                UIElements.body.classList.remove('pulse-effect');
            }, 100); 

        }, intervalTime);
    }
}

//i.a
function mostrarCuriosidades(musica) {
    const curiositiesDiv = document.getElementById('curiosities');

    const fecharCaixa = () => {
        // 1. Inicia a animação de deslizar para fora da tela
        curiositiesDiv.classList.remove('visible');
        
        // 2. Espera a animação (0.5s) terminar e SÓ ENTÃO esconde de verdade.
        setTimeout(() => {
             // Adiciona a classe hidden (display: none)
             curiositiesDiv.classList.add('hidden'); 
             curiositiesDiv.innerHTML = ''; // Limpa o conteúdo
        }, 550); // 50ms a mais que o tempo de transição (0.5s) para segurança.
    };

    const attachCloseListener = () => {
        const closeButton = document.getElementById('close-curiosities');
        
        // Clonar e substituir para garantir que não haja listeners duplicados
        const newCloseButton = closeButton.cloneNode(true);
        closeButton.parentNode.replaceChild(newCloseButton, closeButton);

        if (newCloseButton) {
            newCloseButton.addEventListener('click', fecharCaixa);
        }
    };

    // 1. Lógica de Toggle (Fecha se estiver visível)
    if (curiositiesDiv.classList.contains('visible')) {
        fecharCaixa();
        return; 
    }

    // 2. Lógica de Abertura: Remove 'hidden' e adiciona 'visible'
    curiositiesDiv.classList.remove('hidden'); 
    curiositiesDiv.classList.add('visible');
    curiositiesDiv.innerHTML = `
        <button id="close-curiosities" class="button"><i class="bi bi-x-lg"></i></button>
        <p style="text-align: center;">... IA buscando curiosidades sobre ${musica.name} ...</p>`;
    
    attachCloseListener(); // Listener para o estado de Carregando

    const { name, artist } = musica;

    // 3. Chamada ao Backend (sem mudanças na lógica de fetch/API)
    fetch(`/api/curiosities?name=${encodeURIComponent(name)}&artist=${encodeURIComponent(artist)}`)
        .then(res => {
            if (!res.ok) {
                throw new Error(`Erro HTTP: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            if (data.curiosities && data.curiosities.length > 0) {
                // Conteúdo final (Sucesso)
                curiositiesDiv.innerHTML = `
                    <button id="close-curiosities" class="button"><i class="bi bi-x-lg"></i></button>
                    <div style="padding-top: 1rem;">
                        ${data.curiosities
                            .map(c => {
                                const cleanText = c.trim().replace(/^[\d\-\*\.\s]*/, '');
                                return cleanText ? `<p>🤖 ${cleanText}</p>` : '';
                            })
                            .join('')}
                    </div>`;
            } else {
                // Conteúdo final (Dados vazios)
                curiositiesDiv.innerHTML = `<button id="close-curiosities" class="button"><i class="bi bi-x-lg"></i></button><p style="text-align: center;">❌ Não foi possível carregar curiosidades. (Dados vazios)</p>`;
            }
            attachCloseListener(); // Listener para o estado de Sucesso/Vazio
        })
        .catch(err => {
            // Conteúdo final (Erro)
            console.error('Erro ao buscar curiosidades (Geral):', err);
            curiositiesDiv.innerHTML = `<button id="close-curiosities" class="button"><i class="bi bi-x-lg"></i></button><p style="text-align: center;">⚠️ Erro de comunicação. Verifique o console do servidor e do navegador. (${err.message})</p>`;
            
            attachCloseListener(); // Listener para o estado de Erro
        });
}

//Pesquisa musica teste
function togglePreview(button, url) {
    if (!url) {
        alert('Prévia indisponível para esta música.');
        return;
    }

    const isPlaying = UIElements.previewAudio.src === url && !UIElements.previewAudio.paused;

    // Pausa qualquer coisa que esteja tocando
    UIElements.previewAudio.pause();

    // Restaura todos os ícones para 'play'
    document.querySelectorAll('.preview-button i').forEach(icon => {
        icon.className = 'bi bi-play-fill';
    });

    if (isPlaying) {
        // Se estava tocando, apenas restauramos o ícone e paramos.
        button.querySelector('i').className = 'bi bi-play-fill';
        currentPreviewUrl = null;
    } else {
        // Toca o novo URL
        UIElements.previewAudio.src = url;
        UIElements.previewAudio.play().catch(e => console.error("Erro ao tocar prévia:", e));
        button.querySelector('i').className = 'bi bi-pause-fill';
        currentPreviewUrl = url;

        // Pausa a prévia após 30 segundos ou quando terminar
        UIElements.previewAudio.onended = () => {
             button.querySelector('i').className = 'bi bi-play-fill';
             currentPreviewUrl = null;
        };
    }
}





async function searchAndDisplayResults(query) {
    if (!query.trim()) return;

    // Animação de carregamento (opcional: mudar ícone do botão)
    UIElements.searchButton.innerHTML = '<i class="bi bi-hourglass-split"></i>';

    try {
        const response = await fetch(`/api/search_music?query=${encodeURIComponent(query)}`);
        const results = await response.json();

        UIElements.searchResultsList.innerHTML = ''; // Limpa resultados anteriores

        if (results.length === 0) {
            UIElements.searchResultsList.innerHTML = '<p class="drawer-info-text" style="padding: 1rem;">Nenhuma música encontrada na web.</p>';
        } else {
            results.forEach(song => {
                const resultItem = createSearchResultItem(song);
                UIElements.searchResultsList.appendChild(resultItem);
            });
        }

        openSearchResultsDrawer();

    } catch (error) {
        console.error('Erro na pesquisa de música:', error);
        UIElements.searchResultsList.innerHTML = '<p class="drawer-info-text" style="padding: 1rem;">Erro ao buscar músicas.</p>';
    } finally {
        UIElements.searchButton.innerHTML = '<i class="bi bi-search"></i>'; // Restaura o ícone
    }
}

// Função auxiliar para criar o elemento de resultado
function createSearchResultItem(song) {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.innerHTML = `
        <img src="${song.cover}" alt="${song.name}" class="search-result-item-cover">
        <div class="search-result-item-info">
            <span class="song-title">${song.name}</span>
            <span class="artist-name">${song.artist}</span>
        </div>
        <div class="search-result-item-actions">
            <button class="button button-extra preview-button" data-preview-url="${song.preview_url}" aria-label="Tocar prévia"><i class="bi bi-play-fill"></i></button>
            <button class="button button-extra add-button" data-song-data='${JSON.stringify(song)}' aria-label="Adicionar à playlist"><i class="bi bi-plus-lg"></i></button>
        </div>
    `;

    // Adiciona listeners para os botões de Ação
    item.querySelector('.preview-button').addEventListener('click', (e) => {
        e.stopPropagation(); // Previne o clique no item pai
        togglePreview(e.currentTarget, song.preview_url);
    });

    item.querySelector('.add-button').addEventListener('click', (e) => {
        e.stopPropagation();
        addSongToDatabase(song);
    });

    return item;
}

async function addSongToDatabase(song) {
    // Prepara os dados para o endpoint POST
    const data = {
        name: song.name,
        artist: song.artist,
        cover: song.cover,
        // IMPORTANTE: Aqui estamos usando a URL de prévia como o caminho da música (song_path)
        // Lembre-se que essa URL é temporária/limitada (preview), para uso real, 
        // você precisaria baixar o arquivo ou usar um serviço de streaming.
        song: song.preview_url, 
        genre: song.genre,
        bpm: song.bpm
    };

    try {
        const response = await fetch('/api/add_song', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
          alert(`"${song.name}" de ${song.artist} adicionada com sucesso à playlist!`);

        try {
            const res = await fetch('/api/playlists');
            allPlaylists = await res.json();
            if (allPlaylists.length > 0) {
                playlist = allPlaylists[0].songs;
                populateSongList();
                updateActivePlaylistButton();
            }
            } catch (e) {
        console.error("Erro ao recarregar playlists:", e);
        }

        } else {
            const errorData = await response.json();
            alert(`Erro ao adicionar música: ${errorData.error}`);
        }
    } catch (error) {
        console.error('Erro ao adicionar música:', error);
        alert('Erro de conexão ao adicionar a música.');
    }
}







function stopPulse() {
    clearInterval(pulseInterval);
    UIElements.body.classList.remove('pulse-effect');
}

// AudioVisualizer
function setupAudioVisualizer() {
    if (isVisualizerReady || !UIElements.visualizerCanvas) return;
    
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    source = audioCtx.createMediaElementSource(UIElements.audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    canvasCtx = UIElements.visualizerCanvas.getContext('2d');
    
    const setCanvasDimensions = () => {
    UIElements.visualizerCanvas.width = UIElements.visualizerCanvas.offsetWidth;
    UIElements.visualizerCanvas.height = UIElements.visualizerCanvas.offsetHeight;
    };

    setCanvasDimensions();
    window.addEventListener('resize', setCanvasDimensions);

    isVisualizerReady = true;
    drawVisualizer(); 
}

//Drawvisualizer
function drawVisualizer() {
    if (!isVisualizerReady || !canvasCtx) return;

    requestAnimationFrame(drawVisualizer); 

    analyser.getByteFrequencyData(dataArray);

    const WIDTH = UIElements.visualizerCanvas.width;
    const HEIGHT = UIElements.visualizerCanvas.height;
    
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    const barCount = 64; 
    const step = Math.floor(bufferLength / barCount);
    const barWidth = (WIDTH / barCount) * 0.9; 
    const centerX = WIDTH / 2;
    const barSpacing = 2; 
    const frequencyOffset = 10; 
    let x = 0;

    const [r, g, b] = playerState.currentPalette.length ? playerState.currentPalette[1] : [255, 255, 255];


    for(let i = 0; i < barCount; i++) {
        const dataIndex = (i * step) + frequencyOffset;
        if (dataIndex >= bufferLength) break;
        const dataValue = dataArray[dataIndex];
        const sensitivityFactor = 1; 
        const normalizedHeight = dataValue / 255;
        const barHeight = normalizedHeight * HEIGHT * sensitivityFactor; 
        const finalBarHeight = Math.min(barHeight, HEIGHT);


        canvasCtx.fillStyle = `rgb(${r * (1 + dataValue / 300)}, ${g * (1 + dataValue / 300)}, ${b * (1 + dataValue / 300)})`;
        canvasCtx.fillRect(x, HEIGHT - finalBarHeight, barWidth, finalBarHeight); // Use finalBarHeight aqui
    
        x += barWidth + barSpacing;  
    }
}

function alterColor(rgb, percent) {
    const factor = 1 + percent / 100;
    return rgb.map(c => Math.round(Math.min(255, c * factor)));
}

function updateTheme() {
    if (!playerState.currentPalette.length) return;
    const root = document.documentElement;
    let mainColor = [...playerState.currentPalette[1]];
    let startColor = [...playerState.currentPalette[0]];
    
    const isBgLight = (0.2126 * mainColor[0] + 0.7152 * mainColor[1] + 0.0722 * mainColor[2]) > 128;

    if (playerState.isDarkMode) {
        mainColor = alterColor(mainColor, -50);
        startColor = alterColor(startColor, -50);
        root.style.setProperty('--text-primary-dynamic', 'hsl(0, 0%, 100%)');
        root.style.setProperty('--text-secondary-dynamic', 'hsl(195, 15%, 80%)');
    } else {
        mainColor = alterColor(mainColor, 20);
        startColor = alterColor(startColor, 20);
        root.style.setProperty('--text-primary-dynamic', isBgLight ? 'hsl(0, 0%, 10%)' : 'hsl(0, 0%, 100%)');
        root.style.setProperty('--text-secondary-dynamic', isBgLight ? 'hsl(0, 0%, 25%)' : 'hsl(195, 15%, 80%)');
    }

    root.style.setProperty('--gradient-start', `rgb(${startColor.join(',')})`);
    root.style.setProperty('--gradient-end', `rgb(${mainColor.join(',')})`);
    root.style.setProperty('--compact-bg', `rgba(${mainColor.join(',')}, 0.5)`);
}

function updateMediaSessionMetadata() {
    if ('mediaSession' in navigator) {
        const song = playlist[playerState.currentSongIndex];
        if (!song) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.name, artist: song.artist, album: allPlaylists[currentPlaylistIndex].name,
            artwork: [{ src: song.cover, sizes: '512x512', type: 'image/png' }]
        });
    }
}

function transitionToSong(songIndex, isFromClick = false) {
    if (playerState.isTransitioning || (!isFromClick && songIndex === playerState.currentSongIndex)) return;
    playerState.isTransitioning = true;
    playerState.currentSongIndex = songIndex;
    const newSong = playlist[playerState.currentSongIndex];
    UIElements.coverFg.src = newSong.cover;
    UIElements.compactCover.src = newSong.cover;

    UIElements.coverFg.onload = () => {
        try {
            playerState.currentPalette = colorThief.getPalette(UIElements.coverFg, 2);
            updateTheme();
        } catch(e) { console.error("Error getting color palette", e); }
        
        const inactiveLayer = playerState.activeBgLayer === 1 ? UIElements.bgLayer2 : UIElements.bgLayer1;
        const activeLayer = playerState.activeBgLayer === 1 ? UIElements.bgLayer1 : UIElements.bgLayer2;
        inactiveLayer.style.opacity = '1'; activeLayer.style.opacity = '0';
        UIElements.coverFg.style.opacity = '1';
        UIElements.songName.textContent = newSong.name;
        UIElements.artistName.textContent = newSong.artist;
        UIElements.audio.src = newSong.song;
        play();
        updateMediaSessionMetadata();
        updateActiveSongInList();

        if (newSong.bpm) {
            startPulse(newSong.bpm);
        } else {
            stopPulse();
        }

        setTimeout(() => {
            UIElements.coverBg.src = newSong.cover;
            activeLayer.style.opacity = '1'; inactiveLayer.style.opacity = '0';
            UIElements.coverFg.style.opacity = '0';
            playerState.activeBgLayer = playerState.activeBgLayer === 1 ? 2 : 1;
            playerState.isTransitioning = false;
        }, 1200);
    };
    UIElements.coverFg.onerror = () => { playerState.isTransitioning = false; };
}

function navigateSong(direction) {
    let newIndex;
    if (playerState.isShuffle && playlist.length > 1) {
        do { newIndex = Math.floor(Math.random() * playlist.length); } while (newIndex === playerState.currentSongIndex);
    } else {
        newIndex = (direction === 'next') ? (playerState.currentSongIndex + 1) % playlist.length : (playerState.currentSongIndex - 1 + playlist.length) % playlist.length;
    }
    transitionToSong(newIndex);
}

function play() {
     if (!isVisualizerReady) {
        setupAudioVisualizer(); 
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const playPromise = UIElements.audio.play();
    if (playPromise !== undefined) {
        playPromise.then(() => {
            playerState.isPlaying = true;
            UIElements.playButtonIcon.classList.replace('bi-play-circle-fill', 'bi-pause-circle-fill');
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';

            const currentSong = playlist[playerState.currentSongIndex];
            if (currentSong.bpm) {
                startPulse(currentSong.bpm);
            }

        }).catch(() => pause());
    }
}

function pause() {
    playerState.isPlaying = false;
    UIElements.audio.pause();
    UIElements.playButtonIcon.classList.replace('bi-pause-circle-fill', 'bi-play-circle-fill');
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    stopPulse();
}

function updateProgress(e) {
    if (playerState.isSeeking) return;
    const { duration, currentTime } = e.srcElement;
    if (duration) {
        UIElements.currentProgress.style.width = `${(currentTime / duration) * 100}%`;
        UIElements.totalDurationEl.textContent = formatTime(duration);
        UIElements.currentTimeEl.textContent = formatTime(currentTime);
    }
}

function setSongPosition(e) {
    const rect = UIElements.progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (UIElements.audio.duration) UIElements.audio.currentTime = (clickX / rect.width) * UIElements.audio.duration;
}

function updateSeekPreview(e) {
    if (!UIElements.audio.duration) return;
    const rect = UIElements.progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    UIElements.currentProgress.style.width = `${ratio * 100}%`;
    UIElements.currentTimeEl.textContent = formatTime(ratio * UIElements.audio.duration);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function toggleShuffle() { playerState.isShuffle = !playerState.isShuffle; UIElements.shuffleButton.classList.toggle('active', playerState.isShuffle); }

function toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const nextIndex = (modes.indexOf(playerState.repeatMode) + 1) % modes.length;
    playerState.repeatMode = modes[nextIndex];
    
    const icon = UIElements.repeatButton.querySelector('i.bi');
    UIElements.repeatButton.classList.toggle('active', playerState.repeatMode !== 'off');
    
    if (playerState.repeatMode === 'one') {
        icon.className = 'bi bi-repeat-1';
    } else {
        icon.className = 'bi bi-repeat';
    }
}

function loadNextPlaylist() {
    const nextPlaylistIndex = (currentPlaylistIndex + 1) % allPlaylists.length;
    loadPlaylist(nextPlaylistIndex);
}

function handleSongEnd() {
    const isLastSongOfPlaylist = playerState.currentSongIndex === playlist.length - 1;

    if (playerState.repeatMode === 'one') {
     
        UIElements.audio.currentTime = 0;
        play();
    } else if (isLastSongOfPlaylist && playerState.repeatMode === 'off') {
      
        stopPulse(); 
        loadNextPlaylist();
    } else {
        navigateSong('next');
    }
}

function setVolume(volumeValue) {
    const newVolume = Math.max(0, Math.min(1, volumeValue));
    UIElements.audio.muted = newVolume === 0;
    UIElements.audio.volume = newVolume;
    updateVolumeUI();
}

function toggleMute() {
    if (UIElements.audio.muted || UIElements.audio.volume === 0) {
        setVolume(playerState.lastVolume > 0 ? playerState.lastVolume : 0.1);
    } else {
        setVolume(0);
    }
}

function updateVolumeUI() {
    const currentVolume = UIElements.audio.muted ? 0 : UIElements.audio.volume;
    if (!UIElements.audio.muted && currentVolume > 0) {
        playerState.lastVolume = currentVolume;
    }
    UIElements.volumeSlider.value = currentVolume;
    UIElements.volumePercentage.textContent = `${Math.round(currentVolume * 100)}%`;
    
    if (currentVolume === 0) {
        UIElements.volumeIconItself.className = 'bi bi-volume-mute-fill';
    } else if (currentVolume < 0.5) {
        UIElements.volumeIconItself.className = 'bi bi-volume-down-fill';
    } else {
        UIElements.volumeIconItself.className = 'bi bi-volume-up-fill';
    }
}

function handleKeyboardShortcuts(e) {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    
    e.preventDefault();
    const key = e.key.toLowerCase();

    switch (key) {
        case ' ':
            playerState.isPlaying ? pause() : play();
            break;
        case 'arrowright':
            UIElements.audio.currentTime = Math.min(UIElements.audio.duration, UIElements.audio.currentTime + 5);
            break;
        case 'arrowleft':
            UIElements.audio.currentTime = Math.max(0, UIElements.audio.currentTime - 5);
            break;
        case 'arrowup':
            setVolume(UIElements.audio.volume + 0.05);
            break;
        case 'arrowdown':
            setVolume(UIElements.audio.volume - 0.05);
            break;
        case 'l':
            navigateSong('next');
            break;
        case 'j':
            navigateSong('prev');
            break;
        case 'm':
            toggleMute();
            break;
        case 's':
            toggleShuffle();
            break;
        case 'r':
            toggleRepeat();
            break;
        default:
            if (UIElements.audio.duration && !isNaN(key) && key >= 0 && key <= 9) {
                UIElements.audio.currentTime = UIElements.audio.duration * (parseInt(key) / 10);
            }
            break;
    }
}

function populateSongList() {
    UIElements.songList.innerHTML = '';
    playlist.forEach((song, index) => {
        const button = document.createElement('button');
        button.innerHTML = `
            <img src="${song.cover}" alt="${song.name}" class="drawer-item-cover">
            <div class="drawer-item-info">
                <span class="song-title">${song.name}</span>
                <span class="song-artist">${song.artist}</span>
            </div>`;
        button.addEventListener('click', () => { transitionToSong(index, true); toggleDrawer(null, false); });
        UIElements.songList.appendChild(button);
    });
    updateActiveSongInList();
}

function updateActiveSongInList() {
    UIElements.songList.querySelectorAll('button').forEach((button, index) => button.classList.toggle('active', index === playerState.currentSongIndex));
}
function updateActivePlaylistButton() {
    UIElements.playlistList.querySelectorAll('button').forEach((button, index) => button.classList.toggle('active', index === currentPlaylistIndex));
}

function loadPlaylist(playlistIndex) {
    if (playlistIndex === currentPlaylistIndex && playlist.length > 0) return;
    if (playerState.isTransitioning) return;

    currentPlaylistIndex = playlistIndex;
    playlist = allPlaylists[playlistIndex].songs;
    updateActivePlaylistButton();
    populateSongList();
    transitionToSong(0, true);
}

function toggleDrawer(type, forceState) {
    const drawers = [UIElements.songDrawer, UIElements.playlistDrawer];
    const overlay = UIElements.drawerOverlay;
    let drawerToToggle = null;
    if (type === 'song') drawerToToggle = UIElements.songDrawer;
    if (type === 'playlist') drawerToToggle = UIElements.playlistDrawer;

    const show = forceState ?? (drawerToToggle && !drawerToToggle.classList.contains('visible'));

    overlay.classList.toggle('visible', show);
    drawers.forEach(d => d.classList.remove('visible'));
    if (show && drawerToToggle) {
        drawerToToggle.classList.add('visible');
    }
}

// Função para abrir o drawer
function openSearchResultsDrawer() {
    UIElements.searchResultsDrawer.classList.add('visible');
    UIElements.drawerOverlay.classList.add('visible');
}

// Função para fechar o drawer
function closeSearchResultsDrawer() {
    UIElements.searchResultsDrawer.classList.remove('visible');
    UIElements.drawerOverlay.classList.remove('visible');
    // Para a prévia se estiver tocando
    UIElements.previewAudio.pause();
    currentPreviewUrl = null;
}



function setupMediaSession() {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', play);
        navigator.mediaSession.setActionHandler('pause', pause);
        navigator.mediaSession.setActionHandler('previoustrack', () => navigateSong('prev'));
        navigator.mediaSession.setActionHandler('nexttrack', () => navigateSong('next'));
    }
}

function initializePlayer() {
    const song = playlist[playerState.currentSongIndex];
    UIElements.songName.textContent = song.name;
    UIElements.artistName.textContent = song.artist;
    UIElements.audio.src = song.song;
    UIElements.coverBg.src = song.cover;
    UIElements.compactCover.src = song.cover;

    UIElements.coverBg.onload = () => {
        try {
            playerState.currentPalette = colorThief.getPalette(UIElements.coverBg, 2);
            updateTheme();
        } catch (e) { console.error("Erro ao processar cor:", e); }
    };
    setVolume(playerState.lastVolume);
    updateMediaSessionMetadata();
    populateSongList();
}

function setupTheme() {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    function setTheme(isDark, sourceToggle) {
        playerState.isDarkMode = isDark;
        UIElements.body.classList.toggle('dark-mode', isDark);

        if (sourceToggle !== 'desktop') UIElements.darkModeToggleDesktop.checked = isDark;
        if (sourceToggle !== 'mobile') UIElements.darkModeToggleMobile.checked = isDark;

        updateTheme();
    }
    
    setTheme(prefersDark);

    UIElements.darkModeToggleDesktop.addEventListener('change', (e) => setTheme(e.target.checked, 'desktop'));
    UIElements.darkModeToggleMobile.addEventListener('change', (e) => setTheme(e.target.checked, 'mobile'));
}

async function start() {
    setupTheme();
    UIElements.playButton.addEventListener('click', () => (playerState.isPlaying ? pause() : play()));
    UIElements.nextButton.addEventListener('click', () => navigateSong('next'));
    UIElements.prevButton.addEventListener('click', () => navigateSong('prev'));
    UIElements.shuffleButton.addEventListener('click', toggleShuffle);
    UIElements.repeatButton.addEventListener('click', toggleRepeat);
    UIElements.audio.addEventListener('timeupdate', updateProgress);
    UIElements.audio.addEventListener('ended', handleSongEnd);
    
    UIElements.progressContainer.addEventListener('mousedown', (e) => { playerState.isSeeking = true; updateSeekPreview(e); });
    window.addEventListener('mousemove', (e) => { if(playerState.isSeeking) updateSeekPreview(e); });
    window.addEventListener('mouseup', (e) => { if (playerState.isSeeking) { setSongPosition(e); playerState.isSeeking = false; }});

    UIElements.volumeSlider.addEventListener('input', (e) => setVolume(parseFloat(e.target.value)));
    UIElements.volumeIcon.addEventListener('click', toggleMute);
    window.addEventListener('keydown', handleKeyboardShortcuts);
    
    [UIElements.songMenuButton, UIElements.playlistMenuButton].forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.id.includes('song') ? 'song' : 'playlist';
            toggleDrawer(type);
        });
    });
    
    UIElements.closeSongButton.addEventListener('click', () => toggleDrawer(null, false));
    UIElements.closePlaylistButton.addEventListener('click', () => toggleDrawer(null, false));
    UIElements.drawerOverlay.addEventListener('click', () => toggleDrawer(null, false));
    
   UIElements.curiosityButton.addEventListener('click', () => {
        const currentSong = playlist[playerState.currentSongIndex];
        if (currentSong) {
            mostrarCuriosidades(currentSong);
        }
    });

    // ------------------------------------------------------------------
    // NEW: ADICIONAR LISTENERS DE PESQUISA AQUI
    // ------------------------------------------------------------------
    
    // 1. Listener para o botão de pesquisa
    UIElements.searchButton.addEventListener('click', () => {
        const query = UIElements.searchInput.value;
        searchAndDisplayResults(query);
    });

    // 2. Listener para a tecla Enter no campo de pesquisa
    UIElements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = UIElements.searchInput.value;
            searchAndDisplayResults(query);
        }
    });
    
    // 3. Listener para fechar o drawer de resultados de pesquisa
    UIElements.closeSearchButton.addEventListener('click', closeSearchResultsDrawer);
    // Adicione o listener para parar a prévia se o player principal começar a tocar
    UIElements.audio.addEventListener('play', () => {
        UIElements.previewAudio.pause();
        // Restaura o ícone de todos os botões de prévia
         document.querySelectorAll('.preview-button i').forEach(icon => {
            icon.className = 'bi bi-play-fill';
        });
    });

    try {
        const response = await fetch('/api/playlists');
        allPlaylists = await response.json();
        if (allPlaylists?.length > 0 && allPlaylists[0].songs.length > 0) {
            playlist = allPlaylists[0].songs;
            UIElements.playlistList.innerHTML = '';
            allPlaylists.forEach((p, index) => {
                const button = document.createElement('button');
                const firstSongCover = p.songs[0]?.cover || '';
                button.innerHTML = `
                    <img src="${firstSongCover}" alt="${p.name}" class="drawer-item-cover">
                    <div class="drawer-item-info">
                        <span class="song-title">${p.name}</span>
                    </div>`;
                button.addEventListener('click', () => { loadPlaylist(index); });
                UIElements.playlistList.appendChild(button);
            });
            initializePlayer();
            setupMediaSession();
            updateActivePlaylistButton();
        } else {
            UIElements.songName.textContent = "Nenhuma música encontrada";
        }
    } catch (error) {
        console.error("Erro ao carregar playlists:", error);
        UIElements.songName.textContent = "Erro ao carregar playlists";
    }
}

document.addEventListener('DOMContentLoaded', start);