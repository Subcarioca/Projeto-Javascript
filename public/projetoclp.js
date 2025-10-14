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
};

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