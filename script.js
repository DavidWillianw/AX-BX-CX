
document.addEventListener('DOMContentLoaded', async () => {

    // --- VARIÁVEIS GLOBAIS ---
    let db = { artists: [], albums: [], singles: [], songs: [], players: [] };
    let currentPlayer = null;
    let albumTracklistSortable = null; // Sortable para o form NOVO
    let activeArtist = null;
    let currentFeatTarget = null;
    let viewHistory = [];
    let editingTrackItem = null; // Item da lista sendo editado no modal
    let previousMusicChartData = {};
    let previousAlbumChartData = {};
    let previousRpgChartData = {};
    let albumCountdownInterval = null;
    let existingTrackModalContext = 'album';

    // NOVAS VARIÁVEIS GLOBAIS PARA EDIÇÃO
    let editAlbumTracklistSortable = null; // Instância Sortable para o formulário de EDIÇÃO
    let activeTracklistEditor = null; // Referência para qual editor (novo ou edição) está ativo no momento

    // --- VARIÁVEIS DO PLAYER ---
    let audioElement = null;
    let musicPlayerView = null;
    let playerCloseBtn = null;
    let playerAlbumTitle = null;
    let playerCoverArt = null;
    let playerSongTitle = null;
    let playerArtistName = null;
    let playerSeekBar = null;
    let playerCurrentTime = null;
    let playerTotalTime = null;
    let playerShuffleBtn = null;
    let playerPrevBtn = null;
    let playerPlayPauseBtn = null;
    let playerNextBtn = null;
    let playerRepeatBtn = null;
    let currentSong = null;
    let currentQueue = [];
    let currentQueueIndex = 0;
    let isPlaying = false;
    let isShuffle = false;
    let repeatMode = 'none'; // 'none', 'all', 'one'

    // --- ELEMENTOS DO DOM ---
    let allViews, searchInput, studioView, loginPrompt, loggedInInfo, playerSelect,
        loginButton, logoutButton, studioLaunchWrapper, studioTabs, studioForms,
        newSingleForm, singleArtistSelect, singleReleaseDateInput, singleFeatList,
        newAlbumForm, albumArtistSelect, albumReleaseDateInput,
        albumTracklistEditor, // Editor do NOVO álbum
        featModal, featArtistSelect,
        featTypeSelect, confirmFeatBtn, cancelFeatBtn,
        trackTypeModal, trackTypeSelect, confirmTrackTypeBtn, cancelTrackTypeBtn,
        albumTrackModal, albumTrackModalTitle, openAddTrackModalBtn, // Botão do NOVO álbum
        albumTrackNameInput, albumTrackDurationInput, albumTrackTypeSelect,
        albumTrackFeatList, saveAlbumTrackBtn, cancelAlbumTrackBtn, editingTrackItemId,
        editingTrackExistingId,
        inlineFeatAdder, inlineFeatArtistSelect, inlineFeatTypeSelect,
        confirmInlineFeatBtn, cancelInlineFeatBtn, addInlineFeatBtn,
        editReleaseSection, editReleaseListContainer, editReleaseList, editReleaseForm,
        editReleaseId, editReleaseType, editReleaseTableName, editArtistNameDisplay,
        editReleaseTitle, editReleaseCoverUrl, editReleaseDate, cancelEditBtn, saveEditBtn,
        deleteConfirmModal, deleteReleaseName, deleteRecordId, deleteTableName,
        deleteTrackIds, cancelDeleteBtn, confirmDeleteBtn,
        toggleExistingSingle, newTrackInfoGroup, existingTrackGroup,
        existingTrackSelect, existingSingleTrackId, singleFeatSection,
        openExistingTrackModalBtn, // Botão do NOVO álbum
        existingTrackModal, existingTrackSearch,
        existingTrackResults, cancelExistingTrackBtn, editArtistFilterSelect,
        // NOVOS ELEMENTOS DO DOM PARA EDIÇÃO
        editAlbumTracklistEditor, // Editor do formulário de EDIÇÃO
        editTracklistActions, // Container dos botões de ação de EDIÇÃO
        openEditAddTrackModalBtn, // Botão Adicionar Nova Faixa (EDIÇÃO)
        openEditExistingTrackModalBtn; // Botão Usar Faixa Existente (EDIÇÃO)


    const AIRTABLE_BASE_ID = 'appG5NOoblUmtSMVI';
    const AIRTABLE_API_KEY = 'pat5T28kjmJ4t6TQG.69bf34509e687fff6a3f76bd52e64518d6c92be8b1ee0a53bcc9f50fedcb5c70'; // Use sua chave real aqui

    const PREVIOUS_MUSIC_CHART_KEY = 'spotifyRpg_previousMusicChart';
    const PREVIOUS_ALBUM_CHART_KEY = 'spotifyRpg_previousAlbumChart';
    const PREVIOUS_RPG_CHART_KEY = 'spotifyRpg_previousRpgChart';

    // --- FUNÇÃO PARA INICIALIZAR ELEMENTOS DO DOM ---
    function initializeDOMElements() {
        console.log("Initializing DOM elements...");
        try {
            allViews = document.querySelectorAll('.page-view');
            searchInput = document.getElementById('searchInput');
            studioView = document.getElementById('studioView');
            loginPrompt = document.getElementById('loginPrompt');
            loggedInInfo = document.getElementById('loggedInInfo');
            playerSelect = document.getElementById('playerSelect'); // Note: This ID doesn't seem to be used later
            loginButton = document.getElementById('loginButton');
            logoutButton = document.getElementById('logoutButton');
            studioLaunchWrapper = document.getElementById('studioLaunchWrapper');
            studioTabs = document.querySelectorAll('.studio-tab-btn');
            studioForms = document.querySelectorAll('.studio-form-content');
            newSingleForm = document.getElementById('newSingleForm');
            singleArtistSelect = document.getElementById('singleArtistSelect');
            singleReleaseDateInput = document.getElementById('singleReleaseDate');
            singleFeatList = document.getElementById('singleFeatList');
            newAlbumForm = document.getElementById('newAlbumForm');
            albumArtistSelect = document.getElementById('albumArtistSelect');
            albumReleaseDateInput = document.getElementById('albumReleaseDate');
            albumTracklistEditor = document.getElementById('albumTracklistEditor'); // NOVO
            featModal = document.getElementById('featModal');
            featArtistSelect = document.getElementById('featArtistSelect');
            featTypeSelect = document.getElementById('featTypeSelect');
            confirmFeatBtn = document.getElementById('confirmFeatBtn');
            cancelFeatBtn = document.getElementById('cancelFeatBtn');
            trackTypeModal = document.getElementById('trackTypeModal');
            trackTypeSelect = document.getElementById('trackTypeSelect');
            confirmTrackTypeBtn = document.getElementById('confirmTrackTypeBtn');
            cancelTrackTypeBtn = document.getElementById('cancelTrackTypeBtn');
            albumTrackModal = document.getElementById('albumTrackModal');
            albumTrackModalTitle = document.getElementById('albumTrackModalTitle');
            openAddTrackModalBtn = document.getElementById('openAddTrackModalBtn'); // NOVO
            albumTrackNameInput = document.getElementById('albumTrackNameInput');
            albumTrackDurationInput = document.getElementById('albumTrackDurationInput');
            albumTrackTypeSelect = document.getElementById('albumTrackTypeSelect');
            albumTrackFeatList = document.getElementById('albumTrackFeatList');
            saveAlbumTrackBtn = document.getElementById('saveAlbumTrackBtn');
            cancelAlbumTrackBtn = document.getElementById('cancelAlbumTrackBtn');
            editingTrackItemId = document.getElementById('editingTrackItemId');
            editingTrackExistingId = document.getElementById('editingTrackExistingId');
            inlineFeatAdder = document.getElementById('inlineFeatAdder');
            inlineFeatArtistSelect = document.getElementById('inlineFeatArtistSelect');
            inlineFeatTypeSelect = document.getElementById('inlineFeatTypeSelect');
            confirmInlineFeatBtn = document.getElementById('confirmInlineFeatBtn');
            cancelInlineFeatBtn = document.getElementById('cancelInlineFeatBtn');
            addInlineFeatBtn = albumTrackModal?.querySelector('.add-inline-feat-btn'); // Needs albumTrackModal to exist
            audioElement = document.getElementById('audioElement');
            musicPlayerView = document.getElementById('musicPlayer');
            playerCloseBtn = document.querySelector('.player-close-btn');
            playerAlbumTitle = document.getElementById('playerAlbumTitle');
            playerCoverArt = document.getElementById('playerCoverArt');
            playerSongTitle = document.getElementById('playerSongTitle');
            playerArtistName = document.getElementById('playerArtistName');
            playerSeekBar = document.getElementById('playerSeekBar');
            playerCurrentTime = document.getElementById('playerCurrentTime');
            playerTotalTime = document.getElementById('playerTotalTime');
            playerShuffleBtn = document.getElementById('playerShuffleBtn');
            playerPrevBtn = document.getElementById('playerPrevBtn');
            playerPlayPauseBtn = document.getElementById('playerPlayPauseBtn');
            playerNextBtn = document.getElementById('playerNextBtn');
            playerRepeatBtn = document.getElementById('playerRepeatBtn');
            editReleaseSection = document.getElementById('editReleaseSection');
            editReleaseListContainer = document.getElementById('editReleaseListContainer');
            editReleaseList = document.getElementById('editReleaseList');
            editReleaseForm = document.getElementById('editReleaseForm');
            editReleaseId = document.getElementById('editReleaseId');
            editReleaseType = document.getElementById('editReleaseType');
            editReleaseTableName = document.getElementById('editReleaseTableName');
            editArtistNameDisplay = document.getElementById('editArtistNameDisplay');
            editReleaseTitle = document.getElementById('editReleaseTitle');
            editReleaseCoverUrl = document.getElementById('editReleaseCoverUrl');
            editReleaseDate = document.getElementById('editReleaseDate');
            cancelEditBtn = document.getElementById('cancelEditBtn');
            saveEditBtn = document.getElementById('saveEditBtn');
            deleteConfirmModal = document.getElementById('deleteConfirmModal');
            deleteReleaseName = document.getElementById('deleteReleaseName');
            deleteRecordId = document.getElementById('deleteRecordId');
            deleteTableName = document.getElementById('deleteTableName');
            deleteTrackIds = document.getElementById('deleteTrackIds');
            cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
            confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
            toggleExistingSingle = document.getElementById('toggleExistingSingle');
            newTrackInfoGroup = document.getElementById('newTrackInfoGroup');
            existingTrackGroup = document.getElementById('existingTrackGroup');
            existingTrackSelect = document.getElementById('existingTrackSelect');
            existingSingleTrackId = document.getElementById('existingSingleTrackId');
            singleFeatSection = document.getElementById('singleFeatSection');
            openExistingTrackModalBtn = document.getElementById('openExistingTrackModalBtn'); // NOVO
            existingTrackModal = document.getElementById('existingTrackModal');
            existingTrackSearch = document.getElementById('existingTrackSearch');
            existingTrackResults = document.getElementById('existingTrackResults');
            cancelExistingTrackBtn = document.getElementById('cancelExistingTrackBtn');
            editArtistFilterSelect = document.getElementById('editArtistFilterSelect');

            // ADICIONAR NOVOS ELEMENTOS DE EDIÇÃO
            editAlbumTracklistEditor = document.getElementById('editAlbumTracklistEditor');
            editTracklistActions = document.getElementById('editTracklistActions');
            openEditAddTrackModalBtn = document.getElementById('openEditAddTrackModalBtn');
            openEditExistingTrackModalBtn = document.getElementById('openEditExistingTrackModalBtn');

            const playerElements = [audioElement, musicPlayerView, playerCloseBtn, playerPlayPauseBtn, playerSeekBar, playerNextBtn, playerPrevBtn];
            if (playerElements.some(el => !el)) {
                console.error("ERRO CRÍTICO: Elementos essenciais do PLAYER não foram encontrados!");
                return false;
            }

            const essentialElements = [
                studioView, loginPrompt, newSingleForm, newAlbumForm, featModal,
                singleReleaseDateInput, albumReleaseDateInput, trackTypeModal,
                albumTrackModal, openAddTrackModalBtn, inlineFeatAdder, inlineFeatArtistSelect,
                confirmInlineFeatBtn, cancelInlineFeatBtn, addInlineFeatBtn,
                editReleaseSection, editReleaseListContainer, editReleaseList, editReleaseForm,
                cancelEditBtn, saveEditBtn,
                deleteConfirmModal, cancelDeleteBtn, confirmDeleteBtn,
                toggleExistingSingle, newTrackInfoGroup, existingTrackGroup, existingTrackSelect,
                openExistingTrackModalBtn, existingTrackModal, existingTrackSearch, existingTrackResults, cancelExistingTrackBtn, editArtistFilterSelect,
                // ADICIONAR CHECAGEM DOS NOVOS ELEMENTOS
                editAlbumTracklistEditor, editTracklistActions, openEditAddTrackModalBtn, openEditExistingTrackModalBtn
            ];

            if (!allViews || allViews.length === 0 || essentialElements.some(el => !el)) {
                 const missingIds = essentialElements
                   .map((el, index) => {
                       const expectedId = [ // Correlate index with expected ID (maintain this list)
                           'studioView', 'loginPrompt', 'newSingleForm', 'newAlbumForm', 'featModal',
                           'singleReleaseDate', 'albumReleaseDate', 'trackTypeModal',
                           'albumTrackModal', 'openAddTrackModalBtn', 'inlineFeatAdder', 'inlineFeatArtistSelect',
                           'confirmInlineFeatBtn', 'cancelInlineFeatBtn', /*addInlineFeatBtn has no ID*/ 'addInlineFeatBtn_placeholder',
                           'editReleaseSection', 'editReleaseListContainer', 'editReleaseList', 'editReleaseForm',
                           'cancelEditBtn', 'saveEditBtn',
                           'deleteConfirmModal', 'cancelDeleteBtn', 'confirmDeleteBtn',
                           'toggleExistingSingle', 'newTrackInfoGroup', 'existingTrackGroup', 'existingTrackSelect',
                           'openExistingTrackModalBtn', 'existingTrackModal', 'existingTrackSearch', 'existingTrackResults', 'cancelExistingTrackBtn', 'editArtistFilterSelect',
                           // ADICIONAR NOVOS IDs ESPERADOS
                           'editAlbumTracklistEditor', 'editTracklistActions', 'openEditAddTrackModalBtn', 'openEditExistingTrackModalBtn'
                       ][index];
                       return el ? null : expectedId || `Unknown Element at index ${index}`;
                   })
                   .filter(Boolean); // Remove nulls (found elements)

                console.error("ERRO CRÍTICO: Elementos essenciais do HTML não foram encontrados!", { missingIds });
                document.body.innerHTML = '<div style="color: red; padding: 20px;"><h1>Erro Interface</h1><p>Elementos essenciais não encontrados. Ver console.</p></div>';
                return false;
            }

            // Formata para datetime-local (YYYY-MM-DDTHH:MM)
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); // Ajusta para o fuso horário local
            now.setSeconds(0); // Zera segundos
            now.setMilliseconds(0); // Zera milissegundos
            const localISOTime = now.toISOString().slice(0, 16); // Pega "YYYY-MM-DDTHH:MM"

            if(singleReleaseDateInput) singleReleaseDateInput.value = localISOTime;
            if(albumReleaseDateInput) albumReleaseDateInput.value = localISOTime;

            console.log("DOM elements initialized.");
            return true;
        } catch(error) {
            console.error("Erro ao inicializar elementos do DOM:", error);
            document.body.innerHTML = '<div style="color: red; padding: 20px;"><h1>Erro Interface</h1><p>Erro fatal ao buscar elementos da página. Verifique o console.</p></div>';
            return false;
        }
    }

    // --- 1. CARREGAMENTO DE DADOS ---
    async function fetchAllAirtablePages(baseUrl, fetchOptions) {
        let allRecords = [];
        let offset = null;
        do {
            const separator = baseUrl.includes('?') ? '&' : '?';
            const url = offset ? `${baseUrl}${separator}offset=${offset}` : baseUrl;
            const response = await fetch(url, fetchOptions);
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Falha ao buscar ${url}: ${response.status} - ${errorText}`);
                throw new Error(`Falha na requisição para ${baseUrl}. Status: ${response.status}`);
            }
            const data = await response.json();
            if (data.records) {
                allRecords.push(...data.records);
            }
            offset = data.offset;
        } while (offset);
        return { records: allRecords };
    }

    async function loadAllData() {
        const artistsURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Artists?filterByFormula=%7BArtista%20Principal%7D%3D1`;
        const albumsURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Álbuns')}`;
        const musicasURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Músicas')}`;
        const singlesURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Singles e EPs')}`;
        const playersURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Jogadores`;

        const fetchOptions = { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } };
        console.log("Carregando dados do Airtable...");
        try {
            const [artistsData, albumsData, musicasData, singlesData, playersData] = await Promise.all([
                fetchAllAirtablePages(artistsURL, fetchOptions),
                fetchAllAirtablePages(albumsURL, fetchOptions),
                fetchAllAirtablePages(musicasURL, fetchOptions),
                fetchAllAirtablePages(singlesURL, fetchOptions),
                fetchAllAirtablePages(playersURL, fetchOptions)
            ]);

            if (!playersData) console.warn("Falha ao carregar dados dos Jogadores. Continuando sem eles."); // Warn instead of error
            if (!artistsData || !albumsData || !musicasData || !singlesData) throw new Error('Falha ao carregar dados essenciais (Artistas, Álbuns, Músicas, Singles).');

            const musicasMap = new Map();
            (musicasData.records || []).forEach(record => {
                const fields = record.fields;
                const artistIds = Array.isArray(fields['Artista']) ? fields['Artista'] : [fields['Artista']].filter(Boolean);
                const albumLinks = fields['Álbuns'] || [];
                const singleLinks = fields['Singles e EPs'] || [];
                // Prioritize album link for parent ID, then single link
                const parentReleaseId = (albumLinks.length > 0 ? albumLinks[0] : (singleLinks.length > 0 ? singleLinks[0] : null));

                musicasMap.set(record.id, {
                    id: record.id,
                    title: fields['Nome da Faixa'] || 'Faixa Desconhecida',
                    duration: fields['Duração'] ? new Date(fields['Duração'] * 1000).toISOString().substr(14, 5) : "0:00",
                    trackNumber: fields['Nº da Faixa'] || 0,
                    durationSeconds: fields['Duração'] || 0,
                    artistIds: artistIds,
                    collabType: fields['Tipo de Colaboração'],
                    albumId: parentReleaseId, // ID do release principal (para capa, etc.)
                    albumIds: albumLinks, // Todos os álbuns vinculados
                    singleIds: singleLinks, // Todos os singles vinculados
                    streams: fields.Streams || 0,
                    totalStreams: fields['Streams Totais'] || 0,
                    trackType: fields['Tipo de Faixa'] || 'B-side' // Default to B-side if missing
                });
            });

            const artistsMapById = new Map();
            const artistsList = (artistsData.records || []).map(record => {
                const fields = record.fields;
                const artist = {
                    id: record.id,
                    name: fields.Name || 'Artista Desconhecido',
                    imageUrl: (fields['URL da Imagem']?.[0]?.url) || 'https://i.imgur.com/AD3MbBi.png', // Default image
                    off: fields['Inspirações (Off)'] || [],
                    RPGPoints: fields.RPGPoints || 0,
                    LastActive: fields.LastActive || null,
                    personalPoints: fields['Pontos Pessoais'] || 150 // <-- LINHA ADICIONADA
                };
                artistsMapById.set(artist.id, artist.name);
                return artist;
            });

            const formatReleases = (records, isAlbum) => {
                if (!records) return [];
                return records.map(record => {
                    const fields = record.fields;
                    const id = record.id;
                    // Find associated tracks from the map
                    const tracks = Array.from(musicasMap.values())
                        .filter(song => (isAlbum ? song.albumIds.includes(id) : song.singleIds.includes(id)))
                        .sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0)); // Sort by track number

                    const totalDuration = tracks.reduce((sum, track) => sum + (track.durationSeconds || 0), 0);
                    const totalAlbumStreams = tracks.reduce((sum, track) => sum + (track.totalStreams || 0), 0);

                    const artistId = Array.isArray(fields['Artista']) ? fields['Artista'][0] : (fields['Artista'] || null);
                    const artistName = artistId ? artistsMapById.get(artistId) : "Artista Desconhecido";
                    const imageFieldName = isAlbum ? 'Capa do Álbum' : 'Capa';
                    const imageUrl = (fields[imageFieldName]?.[0]?.url) || 'https://i.imgur.com/AD3MbBi.png'; // Default image

                    // Airtable DATETIME fields return ISO 8601 UTC strings
                    const releaseDateISO = fields['Data de Lançamento'] || null;

                    return {
                        id: id,
                        title: fields['Nome do Álbum'] || fields['Nome do Single/EP'] || 'Título Desconhecido',
                        artist: artistName,
                        artistId: artistId,
                        metascore: fields['Metascore'] || 0,
                        imageUrl: imageUrl,
                        releaseDate: releaseDateISO, // Store the full ISO 8601 string
                        tracks: tracks,
                        trackIds: tracks.map(t => t.id),
                        totalDurationSeconds: totalDuration,
                        weeklyStreams: fields['Stream do album'] || 0, // Ensure field name matches Airtable
                        totalStreams: totalAlbumStreams,
                        type: isAlbum ? 'album' : 'single',
                        tableName: isAlbum ? 'Álbuns' : 'Singles e EPs'
                    };
                });
            };

            const formattedAlbums = formatReleases(albumsData.records, true);
            const formattedSingles = formatReleases(singlesData.records, false);

            const formattedPlayers = (playersData?.records || []).map(record => ({
                id: record.id,
                name: record.fields.Nome,
                password: record.fields.Senha, // Be mindful of storing/transmitting passwords
                artists: record.fields.Artistas || []
            }));

            console.log("Dados do Airtable carregados e formatados.");
            return {
                allArtists: artistsList,
                albums: formattedAlbums,
                singles: formattedSingles,
                players: formattedPlayers,
                musicas: Array.from(musicasMap.values()) // Convert map values back to array
            };
        } catch (error) {
            console.error("Falha GERAL ao carregar dados do Airtable:", error);
            document.body.innerHTML = '<div style="color: red; padding: 20px;"><h1>Erro Crítico</h1><p>Não foi possível carregar os dados. Tente recarregar a página ou contate o suporte.</p></div>';
            return null; // Indicate failure
        }
    }
            const artistsMapById = new Map();
            const artistsList = (artistsData.records || []).map(record => {
                const fields = record.fields;
                const artist = {
                    id: record.id,
                    name: fields.Name || 'Artista Desconhecido',
                    imageUrl: (fields['URL da Imagem']?.[0]?.url) || 'https://i.imgur.com/AD3MbBi.png', // Default image
                    off: fields['Inspirações (Off)'] || [],
                    RPGPoints: fields.RPGPoints || 0,
                    LastActive: fields.LastActive || null
                };
                artistsMapById.set(artist.id, artist.name);
                return artist;
            });

            const formatReleases = (records, isAlbum) => {
                if (!records) return [];
                return records.map(record => {
                    const fields = record.fields;
                    const id = record.id;
                    // Find associated tracks from the map
                    const tracks = Array.from(musicasMap.values())
                        .filter(song => (isAlbum ? song.albumIds.includes(id) : song.singleIds.includes(id)))
                        .sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0)); // Sort by track number

                    const totalDuration = tracks.reduce((sum, track) => sum + (track.durationSeconds || 0), 0);
                    const totalAlbumStreams = tracks.reduce((sum, track) => sum + (track.totalStreams || 0), 0);

                    const artistId = Array.isArray(fields['Artista']) ? fields['Artista'][0] : (fields['Artista'] || null);
                    const artistName = artistId ? artistsMapById.get(artistId) : "Artista Desconhecido";
                    const imageFieldName = isAlbum ? 'Capa do Álbum' : 'Capa';
                    const imageUrl = (fields[imageFieldName]?.[0]?.url) || 'https://i.imgur.com/AD3MbBi.png'; // Default image

                    // Airtable DATETIME fields return ISO 8601 UTC strings
                    const releaseDateISO = fields['Data de Lançamento'] || null;

                    return {
                        id: id,
                        title: fields['Nome do Álbum'] || fields['Nome do Single/EP'] || 'Título Desconhecido',
                        artist: artistName,
                        artistId: artistId,
                        metascore: fields['Metascore'] || 0,
                        imageUrl: imageUrl,
                        releaseDate: releaseDateISO, // Store the full ISO 8601 string
                        tracks: tracks,
                        trackIds: tracks.map(t => t.id),
                        totalDurationSeconds: totalDuration,
                        weeklyStreams: fields['Stream do album'] || 0, // Ensure field name matches Airtable
                        totalStreams: totalAlbumStreams,
                        type: isAlbum ? 'album' : 'single',
                        tableName: isAlbum ? 'Álbuns' : 'Singles e EPs'
                    };
                });
            };

            const formattedAlbums = formatReleases(albumsData.records, true);
            const formattedSingles = formatReleases(singlesData.records, false);

            const formattedPlayers = (playersData?.records || []).map(record => ({
                id: record.id,
                name: record.fields.Nome,
                password: record.fields.Senha, // Be mindful of storing/transmitting passwords
                artists: record.fields.Artistas || []
            }));

            console.log("Dados do Airtable carregados e formatados.");
            return {
                allArtists: artistsList,
                albums: formattedAlbums,
                singles: formattedSingles,
                players: formattedPlayers,
                musicas: Array.from(musicasMap.values()) // Convert map values back to array
            };
        } catch (error) {
            console.error("Falha GERAL ao carregar dados do Airtable:", error);
            document.body.innerHTML = '<div style="color: red; padding: 20px;"><h1>Erro Crítico</h1><p>Não foi possível carregar os dados. Tente recarregar a página ou contate o suporte.</p></div>';
            return null; // Indicate failure
        }
    }

    const initializeData = (data) => {
        try {
            // Load previous chart data from localStorage
            try {
                const prevMusic = localStorage.getItem(PREVIOUS_MUSIC_CHART_KEY);
                previousMusicChartData = prevMusic ? JSON.parse(prevMusic) : {};
                const prevAlbum = localStorage.getItem(PREVIOUS_ALBUM_CHART_KEY);
                previousAlbumChartData = prevAlbum ? JSON.parse(prevAlbum) : {};
                const prevRpg = localStorage.getItem(PREVIOUS_RPG_CHART_KEY);
                previousRpgChartData = prevRpg ? JSON.parse(prevRpg) : {};
                console.log("Dados de chart anteriores carregados do localStorage.");
            } catch (e) {
                console.warn("Erro ao carregar dados de chart anteriores do localStorage:", e);
                previousMusicChartData = {}; previousAlbumChartData = {}; previousRpgChartData = {};
            }

            // Map artists by ID for quick lookup
            const artistsMapById = new Map();
            db.artists = (data.allArtists || []).map(artist => {
                const artistEntry = {
                    ...artist,
                    img: artist.imageUrl || 'https://i.imgur.com/AD3MbBi.png', // Ensure default image
                    albums: [], // Initialize empty arrays for releases
                    singles: [],
                    careerTotalStreams: 0 // <-- NOVO: Inicializa o contador
                };
                artistsMapById.set(artist.id, artist.name);
                return artistEntry;
            });

            // Create a map of release IDs to their release dates (full ISO string)
            const releaseDateMap = new Map();
            const allReleasesForDateMap = [...(data.albums || []), ...(data.singles || [])];
            allReleasesForDateMap.forEach(item => {
                if (item.id && item.releaseDate) {
                    releaseDateMap.set(item.id, item.releaseDate);
                }
            });

            // Process songs to find the earliest release date among linked releases
            db.songs = (data.musicas || []).map(song => {
                const allLinkedIds = [...(song.albumIds || []), ...(song.singleIds || [])];
                let earliestDate = null;

                if (allLinkedIds.length > 0) {
                    const allDates = allLinkedIds
                        .map(id => releaseDateMap.get(id)) // Get ISO strings from the map
                        .filter(Boolean) // Filter out null/undefined dates
                        .map(dateStr => new Date(dateStr)); // Convert ISO strings to Date objects

                    if (allDates.length > 0) {
                        const validDates = allDates.filter(d => !isNaN(d.getTime()));
                        if (validDates.length > 0) {
                            earliestDate = new Date(Math.min.apply(null, validDates));
                        }
                    }
                }
                const earliestDateString = earliestDate ? earliestDate.toISOString() : null;

                return {
                    ...song,
                    streams: song.streams || 0,
                    totalStreams: song.totalStreams || 0,
                    cover: 'https://i.imgur.com/AD3MbBi.png', // Default cover, will be updated later
                    artist: artistsMapById.get((song.artistIds || [])[0]) || 'Artista Desconhecido', // Primary artist name
                    parentReleaseDate: earliestDateString // Store the EARLIEST release date (ISO String or null)
                };
            });

            // Initialize albums and singles arrays
            db.albums = [];
            db.singles = [];

            // Process all releases (albums and singles)
            const allReleases = [...(data.albums || []), ...(data.singles || [])];
            allReleases.forEach(item => {
                // Update covers and potentially albumId/parentReleaseDate for associated songs
                (item.trackIds || []).forEach(trackId => {
                    const songInDb = db.songs.find(sDb => sDb.id === trackId);
                    if (songInDb) {
                        if (songInDb.albumId === item.id && songInDb.cover === 'https://i.imgur.com/AD3MbBi.png') {
                            songInDb.cover = item.imageUrl;
                        }
                        else if (!songInDb.albumId) {
                            if (songInDb.cover === 'https://i.imgur.com/AD3MbBi.png') {
                                songInDb.cover = item.imageUrl;
                            }
                            songInDb.albumId = item.id;
                        }
                        if (!songInDb.parentReleaseDate && item.releaseDate) {
                           console.warn(`Song ${songInDb.id} lacked parentReleaseDate, setting from ${item.id}`);
                            songInDb.parentReleaseDate = item.releaseDate;
                        }
                    }
                });

                // Add the release to the correct array (db.albums or db.singles)
                // and associate it with the primary artist
                const artistEntry = db.artists.find(a => a.id === item.artistId);
                if (item.type === 'album') {
                    db.albums.push(item);
                    if (artistEntry) { artistEntry.albums.push(item); }
                } else {
                    db.singles.push(item);
                    if (artistEntry) { artistEntry.singles.push(item); }
                }
                if (!artistEntry && item.artist !== "Artista Desconhecido") {
                    console.warn(`Artista ${item.artist} (ID: ${item.artistId}) para o lançamento ${item.title} (ID: ${item.id}) não encontrado na lista principal de artistas.`);
                }
            });

            // --- NOVO: CÁLCULO DE STREAMS TOTAIS DA CARREIRA ---
            db.artists.forEach(artist => {
                const artistSongs = db.songs.filter(song => song.artistIds && song.artistIds.includes(artist.id));
                const total = artistSongs.reduce((sum, song) => sum + (song.totalStreams || 0), 0);
                artist.careerTotalStreams = total;
            });
            // --- FIM DA NOVA SEÇÃO ---

            // Assign players data
            db.players = data.players || [];

            console.log(`DB Initialized: Artists: ${db.artists.length}, Albums: ${db.albums.length}, Singles: ${db.singles.length}, Songs: ${db.songs.length}, Players: ${db.players.length}`);
            return true; // Indicate successful initialization
        } catch (error) {
            console.error("ERRO CRÍTICO durante initializeData:", error);
            alert("Erro grave ao processar os dados carregados. A aplicação pode não funcionar corretamente.");
            return false; // Indicate failure
        }
    };
            // Create a map of release IDs to their release dates (full ISO string)
            const releaseDateMap = new Map();
            const allReleasesForDateMap = [...(data.albums || []), ...(data.singles || [])];
            allReleasesForDateMap.forEach(item => {
                if (item.id && item.releaseDate) {
                    releaseDateMap.set(item.id, item.releaseDate);
                }
            });

            // Process songs to find the earliest release date among linked releases
            db.songs = (data.musicas || []).map(song => {
                const allLinkedIds = [...(song.albumIds || []), ...(song.singleIds || [])];
                let earliestDate = null;

                if (allLinkedIds.length > 0) {
                    const allDates = allLinkedIds
                        .map(id => releaseDateMap.get(id)) // Get ISO strings from the map
                        .filter(Boolean) // Filter out null/undefined dates
                        .map(dateStr => new Date(dateStr)); // Convert ISO strings to Date objects

                    if (allDates.length > 0) {
                        const validDates = allDates.filter(d => !isNaN(d.getTime()));
                        if (validDates.length > 0) {
                            earliestDate = new Date(Math.min.apply(null, validDates));
                        }
                    }
                }
                const earliestDateString = earliestDate ? earliestDate.toISOString() : null;

                return {
                    ...song,
                    streams: song.streams || 0,
                    totalStreams: song.totalStreams || 0,
                    cover: 'https://i.imgur.com/AD3MbBi.png', // Default cover, will be updated later
                    artist: artistsMapById.get((song.artistIds || [])[0]) || 'Artista Desconhecido', // Primary artist name
                    parentReleaseDate: earliestDateString // Store the EARLIEST release date (ISO String or null)
                };
            });

            // Initialize albums and singles arrays
            db.albums = [];
            db.singles = [];

            // Process all releases (albums and singles)
            const allReleases = [...(data.albums || []), ...(data.singles || [])];
            allReleases.forEach(item => {
                // Update covers and potentially albumId/parentReleaseDate for associated songs
                (item.trackIds || []).forEach(trackId => {
                    const songInDb = db.songs.find(sDb => sDb.id === trackId);
                    if (songInDb) {
                        if (songInDb.albumId === item.id && songInDb.cover === 'https://i.imgur.com/AD3MbBi.png') {
                            songInDb.cover = item.imageUrl;
                        }
                        else if (!songInDb.albumId) {
                            if (songInDb.cover === 'https://i.imgur.com/AD3MbBi.png') {
                                songInDb.cover = item.imageUrl;
                            }
                            songInDb.albumId = item.id;
                        }
                        if (!songInDb.parentReleaseDate && item.releaseDate) {
                             console.warn(`Song ${songInDb.id} lacked parentReleaseDate, setting from ${item.id}`);
                            songInDb.parentReleaseDate = item.releaseDate;
                        }
                    }
                });

                // Add the release to the correct array (db.albums or db.singles)
                // and associate it with the primary artist
                const artistEntry = db.artists.find(a => a.id === item.artistId);
                if (item.type === 'album') {
                    db.albums.push(item);
                    if (artistEntry) { artistEntry.albums.push(item); }
                } else {
                    db.singles.push(item);
                    if (artistEntry) { artistEntry.singles.push(item); }
                }
                if (!artistEntry && item.artist !== "Artista Desconhecido") {
                    console.warn(`Artista ${item.artist} (ID: ${item.artistId}) para o lançamento ${item.title} (ID: ${item.id}) não encontrado na lista principal de artistas.`);
                }
            });

            // Assign players data
            db.players = data.players || [];

            console.log(`DB Initialized: Artists: ${db.artists.length}, Albums: ${db.albums.length}, Singles: ${db.singles.length}, Songs: ${db.songs.length}, Players: ${db.players.length}`);
            return true; // Indicate successful initialization
        } catch (error) {
            console.error("ERRO CRÍTICO durante initializeData:", error);
            alert("Erro grave ao processar os dados carregados. A aplicação pode não funcionar corretamente.");
            return false; // Indicate failure
        }
    };

    const saveChartDataToLocalStorage = (chartType) => {
        let currentChartData, storageKey, dataList;
        console.log(`Salvando dados do chart anterior para: ${chartType}`);

        const now = new Date(); // Get current time for filtering released items

        if (chartType === 'music') {
            storageKey = PREVIOUS_MUSIC_CHART_KEY;
             dataList = [...db.songs]
               .filter(song => (song.streams || 0) > 0 && song.parentReleaseDate && new Date(song.parentReleaseDate) <= now)
               .sort((a, b) => (b.streams || 0) - (a.streams || 0))
               .slice(0, 50);
            currentChartData = dataList.reduce((acc, item, index) => { acc[item.id] = index + 1; return acc; }, {});
            previousMusicChartData = currentChartData; // Update in-memory cache

        } else if (chartType === 'album') {
            storageKey = PREVIOUS_ALBUM_CHART_KEY;
             dataList = [...db.albums, ...db.singles]
               .filter(item => (item.weeklyStreams || 0) > 0 && item.releaseDate && new Date(item.releaseDate) <= now)
               .sort((a, b) => (b.weeklyStreams || 0) - (a.weeklyStreams || 0))
               .slice(0, 50);
            currentChartData = dataList.reduce((acc, item, index) => { acc[item.id] = index + 1; return acc; }, {});
            previousAlbumChartData = currentChartData; // Update in-memory cache

        } else if (chartType === 'rpg') {
            storageKey = PREVIOUS_RPG_CHART_KEY;
            dataList = computeChartData(db.artists); // computeChartData handles its own logic
            currentChartData = dataList.reduce((acc, item, index) => { acc[item.id] = index + 1; return acc; }, {});
            previousRpgChartData = currentChartData; // Update in-memory cache

        } else {
            console.error("Tipo de chart inválido para salvar:", chartType);
            return;
        }

        try {
            localStorage.setItem(storageKey, JSON.stringify(currentChartData));
            console.log(`Chart ${chartType} salvo no localStorage.`);
        } catch (e) {
            console.error(`Erro ao salvar chart ${chartType} no localStorage:`, e);
        }
    };

    async function refreshAllData() {
        console.log("Atualizando todos os dados...");
        document.body.classList.add('loading'); // Show loading indicator
        const data = await loadAllData();

        if (data && data.allArtists) { // Check if essential data was loaded
            if (initializeData(data)) { // Process the loaded data
                console.log("Dados atualizados e processados localmente.");

                // Re-render components that depend on the data
                renderRPGChart();
                renderArtistsGrid('homeGrid', [...(db.artists || [])].sort(() => 0.5 - Math.random()).slice(0, 10)); // Re-render home grid with random artists
                renderChart('music');
                renderChart('album');

                // Update studio elements if player is logged in
                if (currentPlayer) {
                    populateArtistSelector(currentPlayer.id); // Repopulate artist dropdowns

                    if (document.querySelector('.studio-tab-btn[data-form="edit"]')?.classList.contains('active')) {
                        populateEditableReleases();
                         editReleaseForm?.classList.add('hidden'); // Ensure edit form is hidden initially
                         editReleaseListContainer?.classList.remove('hidden'); // Show the list
                    }
                    if (toggleExistingSingle?.checked) {
                        populatePlayerTracks('existingTrackSelect');
                    }
                }

                // If currently viewing an artist detail page, refresh it
                const artistDetailView = document.getElementById('artistDetail');
                if (activeArtist && artistDetailView && !artistDetailView.classList.contains('hidden')) {
                    const refreshedArtistData = db.artists.find(a => a.id === activeArtist.id);
                    if (refreshedArtistData) {
                        openArtistDetail(refreshedArtistData.name); // Re-open with updated data
                    } else {
                        console.warn("Artista ativo não encontrado após atualização, voltando.");
                        handleBack(); // Go back if the artist somehow disappeared
                    }
                }
                 // If currently viewing an album detail page, refresh it (important for countdowns ending)
                  const albumDetailView = document.getElementById('albumDetail');
                  // Assume albumDetail view has a data attribute like data-album-id
                  const currentAlbumId = albumDetailView?.dataset.albumId;
                  if (currentAlbumId && !albumDetailView.classList.contains('hidden')) {
                      const refreshedAlbumData = [...db.albums, ...db.singles].find(a => a.id === currentAlbumId);
                      if (refreshedAlbumData) {
                          openAlbumDetail(refreshedAlbumData.id); // Re-open with updated data
                      } else {
                          console.warn("Álbum/Single ativo não encontrado após atualização, voltando.");
                          handleBack();
                      }
                  }


                // Re-attach essential navigation listeners (important if elements were re-rendered)
                try {
                    attachNavigationListeners();
                } catch (listenerError) {
                    console.error("Erro ao reatribuir listeners de navegação após atualização:", listenerError);
                }

                document.body.classList.remove('loading'); // Hide loading indicator
                console.log("Atualização concluída.");
                return true; // Indicate success
            } else {
                 console.error("Falha ao inicializar dados após atualização.");
                 alert("Erro ao processar dados atualizados.");
                 document.body.classList.remove('loading');
                 return false;
            }
        } else {
            console.error("Falha ao carregar dados brutos durante a atualização.");
            alert("Não foi possível buscar as atualizações mais recentes.");
            document.body.classList.remove('loading'); // Hide loading indicator
            return false; // Indicate failure
        }
    }


    // --- 2. NAVEGAÇÃO E UI ---

    const switchView = (viewId) => {
        console.log(`switchView called with viewId: ${viewId}`); // <--- ADICIONE ESTA LINHA
        console.log(`Mudando para view: ${viewId}`);
        const currentView = document.querySelector('.page-view:not(.hidden)');

        // Clear album countdown interval if navigating away from album detail
        if (currentView && currentView.id === 'albumDetail' && viewId !== 'albumDetail' && albumCountdownInterval) {
            console.log("Limpando intervalo de contagem regressiva do álbum.");
            clearInterval(albumCountdownInterval);
            albumCountdownInterval = null;
        }

        // Hide all views
        allViews.forEach(v => v.classList.add('hidden'));

        // Show the target view
        const target = document.getElementById(viewId);
        if (target) {
            target.classList.remove('hidden');
            // Add data attribute for album ID when switching to album detail
            if (viewId === 'albumDetail' && target.dataset.albumId) {
                // Ensure the dataset reflects the currently viewed album
                // The dataset.albumId should ideally be set in openAlbumDetail
            } else if (viewId !== 'albumDetail') {
                 // Clear the dataset when leaving album detail
                 const albumDetailView = document.getElementById('albumDetail');
                 if(albumDetailView) delete albumDetailView.dataset.albumId;
            }

            window.scrollTo(0, 0); // Scroll to top

            // Manage navigation history (push non-main views, clear on main view)
            if (viewId !== 'mainView' && viewId !== 'studioView') { // Don't push studio view to history for simplicity
                if (viewHistory.length === 0 || viewHistory[viewHistory.length - 1] !== viewId) {
                    viewHistory.push(viewId);
                }
            } else if (viewId === 'mainView') {
                viewHistory = []; // Reset history when returning to main view
            }
            console.log("Histórico de views:", viewHistory);
        } else {
            console.error(`View com ID "${viewId}" não encontrada. Voltando para mainView.`);
             // Fallback to mainView if target doesn't exist
             document.getElementById('mainView')?.classList.remove('hidden');
             viewHistory = [];
        }
    };

    function activateMainViewSection(sectionId) {
        document.querySelectorAll('#mainView .content-section').forEach(s => s.classList.remove('active'));
        const targetSection = document.getElementById(sectionId);
        if (targetSection && document.getElementById('mainView')?.contains(targetSection)) {
            targetSection.classList.add('active');
            console.log(`Seção ativada em mainView: ${sectionId}`);
        } else {
            console.warn(`Seção com ID "${sectionId}" não encontrada dentro de mainView. Ativando homeSection como fallback.`);
            document.getElementById('homeSection')?.classList.add('active'); // Fallback to home
            return 'homeSection'; // Return the actual activated section ID
        }
        return sectionId; // Return the requested section ID if successful
    }

    const switchTab = (event, forceTabId = null) => {
        let targetTabId;

        if (forceTabId) {
            targetTabId = forceTabId;
            console.log(`Forçando troca para tab: ${targetTabId}`);
        } else if (event) {
            event.preventDefault();
            const clickedButton = event.target.closest('[data-tab]');
            if (!clickedButton) {
                console.log("switchTab: Elemento clicado não possui 'data-tab'.");
                return;
            }
            targetTabId = clickedButton.dataset.tab;
            console.log(`Trocando para tab via clique: ${targetTabId}`);
        } else {
            console.log("switchTab: Chamado sem evento ou forceTabId.");
            return;
        }

        // --- View Switching Logic ---
        if (targetTabId === 'studioSection') {
            console.log("Mudando para a view do Estúdio.");
            switchView('studioView');
            const activeStudioTabButton = document.querySelector('.studio-tab-btn.active');
              if (activeStudioTabButton?.dataset.form === 'edit') {
                   populateEditableReleases();
                   editReleaseListContainer?.classList.remove('hidden');
                   editReleaseForm?.classList.add('hidden');
              } else {
                  const currentlyActiveForm = document.querySelector('.studio-form-content.active');
                   if (!currentlyActiveForm) { // If no form is active, default to single
                        document.getElementById('newSingleForm')?.classList.add('active');
                        document.querySelector('.studio-tab-btn[data-form="single"]')?.classList.add('active');
                   }
              }

        } else {
            const mainViewElement = document.getElementById('mainView');
            if (mainViewElement?.classList.contains('hidden')) {
                console.log("Mudando para a view Principal.");
                switchView('mainView');
            }
            console.log(`Ativando seção dentro da view Principal: ${targetTabId}`);
            targetTabId = activateMainViewSection(targetTabId); // Activate and get the final section ID (could be fallback)
        }

        // --- Update Active State for Navigation Buttons ---
        console.log(`Atualizando estado ativo para botões de navegação [data-tab="${targetTabId}"]`);
        document.querySelectorAll('.nav-tab, .bottom-nav-item').forEach(button => button.classList.remove('active'));
        document.querySelectorAll(`.nav-tab[data-tab="${targetTabId}"], .bottom-nav-item[data-tab="${targetTabId}"]`).forEach(button => button.classList.add('active'));
    };

    const handleBack = () => {
console.log("handleBack called. Current history:", JSON.stringify(viewHistory)); // <--- ADICIONE ESTA LINHA
    const currentViewElement = document.querySelector('.page-view:not(.hidden)');
    console.log("Botão Voltar pressionado.");

        if (currentViewElement && currentViewElement.id === 'albumDetail' && albumCountdownInterval) {
            console.log("Limpando contagem regressiva do álbum ao voltar.");
            clearInterval(albumCountdownInterval);
            albumCountdownInterval = null;
        }

viewHistory.pop(); // Remove a view atual
    const previousViewId = viewHistory.pop() || 'mainView'; // Pega a view anterior
    console.log("Popped history. Intending to switch to:", previousViewId); // <--- ADICIONE ESTA LINHA
        switchView(previousViewId); // Switch to the previous view
    };

    const renderArtistsGrid = (containerId, artists) => {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Contêiner de grid com ID "${containerId}" não encontrado.`);
            return;
        }
        if (!artists || artists.length === 0) {
            container.innerHTML = '<p class="empty-state">Nenhum artista para exibir.</p>';
            return;
        }
        container.innerHTML = artists.map(artist => `
            <div class="artist-card" data-artist-name="${artist.name}">
                <img src="${artist.img || artist.imageUrl || 'https://i.imgur.com/AD3MbBi.png'}" alt="${artist.name}" class="artist-card-img">
                <p class="artist-card-name">${artist.name}</p>
                <span class="artist-card-type">Artista</span>
            </div>
        `).join('');
    };

    function formatArtistString(artistIds, collabType) {
        if (!artistIds || artistIds.length === 0) return "Artista Desconhecido";

        const artistNames = artistIds.map(id => {
            const artist = db.artists.find(art => art.id === id);
            return artist ? artist.name : "Artista Desconhecido";
        });

        const mainArtist = artistNames[0];
        if (artistNames.length === 1) {
            return mainArtist; // Only one artist
        }

        const otherArtists = artistNames.slice(1).join(', ');
        if (collabType === 'Dueto/Grupo') {
            return `${mainArtist} & ${otherArtists}`;
        } else { // Default or 'Feat.'
             // Adjusted to always return the full formatted name for display consistency
             return `${mainArtist} (feat. ${otherArtists})`;
        }
    }

    function getCoverUrl(parentReleaseId) {
        if (!parentReleaseId) return 'https://i.imgur.com/AD3MbBi.png'; // Default if no parent ID
        const release = [...db.albums, ...db.singles].find(r => r.id === parentReleaseId);
        return release ? release.imageUrl : 'https://i.imgur.com/AD3MbBi.png'; // Return found URL or default
    }

    const renderChart = (type) => {
        let containerId, dataList, previousData;
        const now = new Date(); // Get current time to filter only released items

        if (type === 'music') {
            containerId = 'musicChartsList';
            dataList = [...db.songs]
               .filter(song => (song.streams || 0) > 0 && song.parentReleaseDate && new Date(song.parentReleaseDate) <= now)
               .sort((a, b) => (b.streams || 0) - (a.streams || 0)) // Sort by weekly streams (desc)
               .slice(0, 50); // Get top 50
            previousData = previousMusicChartData;
        } else if (type === 'album') {
            containerId = 'albumChartsList';
             dataList = [...db.albums, ...db.singles]
               .filter(item => (item.weeklyStreams || 0) > 0 && item.releaseDate && new Date(item.releaseDate) <= now)
               .sort((a, b) => (b.weeklyStreams || 0) - (a.weeklyStreams || 0)) // Sort by weekly streams (desc)
               .slice(0, 50); // Get top 50
            previousData = previousAlbumChartData;
        } else {
             console.error(`Tipo de chart inválido para renderizar: ${type}`);
             return;
        }

        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Contêiner de chart com ID "${containerId}" não encontrado.`);
            return;
        }

        if (!dataList || dataList.length === 0) {
            container.innerHTML = `<p class="empty-state">Nenhum item no chart no momento.</p>`;
            return;
        }

        container.innerHTML = dataList.map((item, index) => {
            const currentRank = index + 1;
            const previousRank = previousData[item.id]; // Get previous rank from stored data
            let iconClass = 'fa-minus'; // Default: stable
            let trendClass = 'trend-stable';

            if (previousRank === undefined) { // New entry
                trendClass = 'trend-new';
            } else if (currentRank < previousRank) { // Moved up
                iconClass = 'fa-caret-up';
                trendClass = 'trend-up';
            } else if (currentRank > previousRank) { // Moved down
                iconClass = 'fa-caret-down';
                trendClass = 'trend-down';
            }

            const indicatorHtml = `<span class="chart-rank-indicator ${trendClass}"><i class="fas ${iconClass}"></i></span>`;

            if (type === 'music') {
                const artistName = formatArtistString(item.artistIds, item.collabType);
                const cover = item.cover !== 'https://i.imgur.com/AD3MbBi.png' ? item.cover : getCoverUrl(item.albumId);
                return `
                    <div class="chart-item" data-song-id="${item.id}">
                        ${indicatorHtml}
                        <span class="chart-rank">${currentRank}</span>
                        <img src="${cover}" alt="${item.title}" class="chart-item-img">
                        <div class="chart-item-info">
                            <span class="chart-item-title">${item.title}</span>
                            <span class="chart-item-artist">${item.artist /* Nome principal apenas */}</span>
                        </div>
                        <span class="chart-item-duration">${(item.streams || 0).toLocaleString('pt-BR')}</span>
                    </div>`;
            } else { // type === 'album'
                return `
                    <div class="chart-item" data-album-id="${item.id}">
                          ${indicatorHtml}
                        <span class="chart-rank">${currentRank}</span>
                        <img src="${item.imageUrl}" alt="${item.title}" class="chart-item-img">
                        <div class="chart-item-info">
                            <span class="chart-item-title">${item.title}</span>
                            <span class="chart-item-artist">${item.artist}</span>
                        </div>
                        <span class="chart-item-score">${(item.weeklyStreams || 0).toLocaleString('pt-BR')}</span>
                    </div>`;
            }
        }).join('');
    };

    const openArtistDetail = (artistName) => {
        const artist = db.artists.find(a => a.name === artistName);
        if (!artist) {
            console.error(`Artista "${artistName}" não encontrado.`);
            handleBack();
            return;
        }

        activeArtist = artist;

        document.getElementById('detailBg').style.backgroundImage = `url(${artist.img})`;
        document.getElementById('detailName').textContent = artist.name;

        const now = new Date();

        const popularSongs = [...db.songs]
            .filter(s =>
                s.artistIds &&
                s.artistIds.includes(artist.id) &&
                (s.totalStreams || 0) > 0 &&
                s.parentReleaseDate && new Date(s.parentReleaseDate) <= now
            )
            .sort((a, b) => (b.totalStreams || 0) - (a.totalStreams || 0))
            .slice(0, 5);

        const popularContainer = document.getElementById('popularSongsList');
        if (popularSongs.length > 0) {
            popularContainer.innerHTML = popularSongs.map((song, index) => `
                <div class="song-row" data-song-id="${song.id}">
                    <span>${index + 1}</span>
                    <div class="song-row-info">
                        <img src="${song.cover || getCoverUrl(song.albumId)}" alt="${song.title}" class="song-row-cover">
                        <span class="song-row-title">${song.title}</span>
                    </div>
                    <span class="song-streams">${(song.totalStreams || 0).toLocaleString('pt-BR')}</span>
                </div>
            `).join('');
        } else {
            popularContainer.innerHTML = '<p class="empty-state-small">Nenhuma música popular lançada encontrada.</p>';
        }

        const nowSort = new Date();
        const customSort = (a, b) => {
            const dateA = new Date(a.releaseDate);
            const dateB = new Date(b.releaseDate);
            const isAFuture = dateA > nowSort;
            const isBFuture = dateB > nowSort;

            if (isAFuture && isBFuture) { return dateA - dateB; }
            else if (isAFuture) { return -1; }
            else if (isBFuture) { return 1; }
            else { return dateB - dateA; }
        };

        const albumsContainer = document.getElementById('albumsList');
        const sortedAlbums = (artist.albums || []).sort(customSort);
        albumsContainer.innerHTML = sortedAlbums.map(album => `
            <div class="scroll-item" data-album-id="${album.id}">
                <img src="${album.imageUrl}" alt="${album.title}">
                <p>${album.title}</p>
                <span>${new Date(album.releaseDate).getFullYear()}</span>
            </div>
        `).join('') || '<p class="empty-state-small">Nenhum álbum encontrado.</p>';

        const singlesContainer = document.getElementById('singlesList');
        const sortedSingles = (artist.singles || []).sort(customSort);
        singlesContainer.innerHTML = sortedSingles.map(single => `
            <div class="scroll-item" data-album-id="${single.id}">
                <img src="${single.imageUrl}" alt="${single.title}">
                <p>${single.title}</p>
                <span>${new Date(single.releaseDate).getFullYear()}</span>
            </div>
        `).join('') || '<p class="empty-state-small">Nenhum single ou EP encontrado.</p>';

        const recommended = [...db.artists]
            .filter(a => a.id !== artist.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 5);
        renderArtistsGrid('recommendedGrid', recommended);

        switchView('artistDetail');
    };

    const openAlbumDetail = (albumId) => {
        const album = [...db.albums, ...db.singles].find(a => a.id === albumId);
        if (!album) {
            console.error(`Álbum/Single com ID "${albumId}" não encontrado.`);
            handleBack();
            return;
        }

        // Adiciona o ID ao dataset da view para referência posterior (refresh)
        const albumDetailView = document.getElementById('albumDetail');
        if (albumDetailView) albumDetailView.dataset.albumId = albumId;


        if (albumCountdownInterval) {
            clearInterval(albumCountdownInterval);
            albumCountdownInterval = null;
            console.log("Intervalo de contagem regressiva anterior limpo.");
        }

        const countdownContainer = document.getElementById('albumCountdownContainer');
        const normalInfoContainer = document.getElementById('albumNormalInfoContainer');
        const tracklistContainer = document.getElementById('albumTracklist');

        document.getElementById('albumDetailBg').style.backgroundImage = `url(${album.imageUrl})`;
        document.getElementById('albumDetailCover').src = album.imageUrl;
        document.getElementById('albumDetailTitle').textContent = album.title;

        const releaseDate = new Date(album.releaseDate);
        const now = new Date();
        const isPreRelease = releaseDate > now;

        const artistObj = db.artists.find(a => a.id === album.artistId);

        if (isPreRelease) {
            normalInfoContainer?.classList.add('hidden');
            countdownContainer?.classList.remove('hidden');

            const releaseDateStr = releaseDate.toLocaleString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            document.getElementById('albumCountdownReleaseDate').textContent = releaseDateStr;

            startAlbumCountdown(album.releaseDate, 'albumCountdownTimer');

            tracklistContainer.innerHTML = (album.tracks || []).map(track => {
                const fullSong = db.songs.find(s => s.id === track.id);
                let isAvailable = false;
                const preReleaseAvailableTypes = ['Title Track', 'Pre-release Single'];

                if (fullSong) {
                    const hasSongReleased = fullSong.parentReleaseDate && new Date(fullSong.parentReleaseDate) <= now;
                    const isDesignatedPreRelease = preReleaseAvailableTypes.includes(fullSong.trackType);
                    isAvailable = hasSongReleased || isDesignatedPreRelease;
                }

                const artistName = formatArtistString(track.artistIds, track.collabType);
                const trackNumDisplay = track.trackNumber ? track.trackNumber : '?';

                if (isAvailable) {
                    return `
                        <div class="track-row available" data-song-id="${track.id}">
                            <span class="track-number"><i class="fas fa-play"></i></span>
                            <div class="track-info">
                                <span class="track-title">${track.title}</span>
                                <span class="track-artist-feat">${artistName}</span>
                            </div>
                            <span class="track-duration">${track.duration}</span>
                        </div>`;
                } else {
                    return `
                        <div class="track-row unavailable">
                            <span class="track-number">${trackNumDisplay}</span>
                            <div class="track-info">
                                <span class="track-title">${track.title}</span>
                                <span class="track-artist-feat">${artistName}</span>
                            </div>
                            <span class="track-duration"><i class="fas fa-lock"></i></span>
                        </div>`;
                }
            }).join('') || '<p class="empty-state-small">Tracklist ainda não revelada.</p>';

        } else {
            normalInfoContainer?.classList.remove('hidden');
            countdownContainer?.classList.add('hidden');

            const releaseYear = releaseDate.getFullYear();
            const totalAlbumStreamsFormatted = (album.totalStreams || 0).toLocaleString('pt-BR');
            document.getElementById('albumDetailInfo').innerHTML =
                `Por <strong class="artist-link" data-artist-name="${artistObj ? artistObj.name : ''}">${album.artist}</strong> • ${releaseYear} • ${totalAlbumStreamsFormatted} streams totais`;

            tracklistContainer.innerHTML = (album.tracks || []).map(song => {
                const artistName = formatArtistString(song.artistIds, song.collabType);
                const streams = (song.totalStreams || 0); // Use total streams for individual tracks
                const trackNumDisplay = song.trackNumber ? song.trackNumber : '?';
                return `
                    <div class="track-row" data-song-id="${song.id}">
                        <span class="track-number">${trackNumDisplay}</span>
                        <div class="track-info">
                            <span class="track-title">${song.title}</span>
                            <span class="track-artist-feat">${artistName}</span>
                        </div>
                        <span class="track-duration">${streams.toLocaleString('pt-BR')}</span>
                    </div>`;
            }).join('') || '<p class="empty-state-small">Nenhuma faixa encontrada para este lançamento.</p>'; // Fallback message
        }
        switchView('albumDetail');
    };

    const openDiscographyDetail = (type) => {
        if (!activeArtist) {
            console.error("Nenhum artista ativo para exibir discografia.");
            handleBack();
            return;
        }

        const nowSort = new Date();
        const customSort = (a, b) => {
            const dateA = new Date(a.releaseDate);
            const dateB = new Date(b.releaseDate);
            const isAFuture = dateA > nowSort;
            const isBFuture = dateB > nowSort;

            if (isAFuture && isBFuture) { return dateA - dateB; } // Future Asc
            else if (isAFuture) { return -1; } // Future before Past
            else if (isBFuture) { return 1; } // Past after Future
            else { return dateB - dateA; } // Past Desc
        };

        const data = (type === 'albums')
            ? (activeArtist.albums || []).sort(customSort)
            : (activeArtist.singles || []).sort(customSort);

        const title = (type === 'albums') ? `Álbuns de ${activeArtist.name}` : `Singles & EPs de ${activeArtist.name}`;
        document.getElementById('discographyTypeTitle').textContent = title;

        const grid = document.getElementById('discographyGrid');
        grid.innerHTML = data.map(item => `
            <div class="scroll-item" data-album-id="${item.id}">
                <img src="${item.imageUrl}" alt="${item.title}">
                <p>${item.title}</p>
                <span>${new Date(item.releaseDate).getFullYear()}</span>
            </div>
        `).join('') || '<p class="empty-state">Nenhum lançamento encontrado.</p>'; // Fallback message

        switchView('discographyDetail');
    };

    const handleSearch = () => {
        const query = searchInput.value.toLowerCase().trim();
        if (!query) {
            switchTab(null, 'homeSection');
            return;
        }

        const resultsContainer = document.getElementById('searchResults');
        const noResultsElement = document.getElementById('noResults');
        if (!resultsContainer || !noResultsElement) {
             console.error("Elementos de resultados da busca não encontrados.");
             return;
        }

        const filteredArtists = db.artists.filter(a => a.name.toLowerCase().includes(query));
        const filteredAlbums = [...db.albums, ...db.singles].filter(a => a.title.toLowerCase().includes(query));

        let html = '';
        let resultCount = 0;

        if (filteredArtists.length > 0) {
            html += '<h3 class="section-title">Artistas</h3>';
            html += filteredArtists.map(a => {
                resultCount++;
                return `
                    <div class="artist-card" data-artist-name="${a.name}">
                        <img src="${a.img}" alt="${a.name}" class="artist-card-img">
                        <p class="artist-card-name">${a.name}</p>
                        <span class="artist-card-type">Artista</span>
                    </div>`;
            }).join('');
        }

        if (filteredAlbums.length > 0) {
            html += '<h3 class="section-title">Álbuns & Singles</h3>';
            html += filteredAlbums.map(al => {
                resultCount++;
                return `
                    <div class="artist-card" data-album-id="${al.id}">
                        <img src="${al.imageUrl}" alt="${al.title}" class="artist-card-img">
                        <p class="artist-card-name">${al.title}</p>
                        <span class="artist-card-type">${al.artist}</span>
                    </div>`;
            }).join('');
        }

        resultsContainer.innerHTML = html;
        if (resultCount > 0) {
            noResultsElement.classList.add('hidden');
            resultsContainer.classList.remove('hidden');
        } else {
            noResultsElement.classList.remove('hidden');
            resultsContainer.classList.add('hidden');
        }

        switchTab(null, 'searchSection');
    };

const setupCountdown = (timerId, chartType) => {
        const timerElement = document.getElementById(timerId);
        if (!timerElement) {
             console.warn(`Elemento de timer com ID "${timerId}" não encontrado.`);
             return;
        }

        const calculateTargetDate = () => {
            const now = new Date();
            const target = new Date(now);

            // Verificamos o tipo de chart para aplicar a lógica correta
            if (chartType === 'rpg') {
                // --- NOVA LÓGICA (DIÁRIA) PARA O RPG ---
                // A "semana" do RPG reseta todo dia à meia-noite (UTC)
                target.setUTCDate(now.getUTCDate() + 1);
                target.setUTCHours(0, 0, 0, 0);

            } else {
                // --- LÓGICA ANTIGA (SEMANAL) PARA MÚSICA/ÁLBUM ---
                let daysUntilMonday = (1 - now.getDay() + 7) % 7;
                if (daysUntilMonday === 0 && (now.getUTCHours() > 0 || now.getUTCMinutes() > 0 || now.getUTCSeconds() > 0)) {
                     daysUntilMonday = 7;
                } else if (daysUntilMonday === 0 && now.getUTCHours() === 0 && now.getUTCMinutes() === 0 && now.getUTCSeconds() === 0) {
                     // daysUntilMonday = 7; // Mantenha comentado ou remova
                }
                target.setUTCDate(now.getUTCDate() + daysUntilMonday);
                target.setUTCHours(0, 0, 0, 0);
            }
            
            return target;
        };

        let targetDate = calculateTargetDate();

        const updateTimerDisplay = (distance) => {
            if (distance < 0) {
                timerElement.textContent = `Atualizando...`;
                return;
            }
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            const format = (num) => (num < 10 ? '0' + num : num);

            // A lógica de exibição muda se for o timer diário
            if (chartType === 'rpg') {
                // Não mostra "dias" se a contagem for sempre diária
                timerElement.textContent = `${format(hours)}h ${format(minutes)}m ${format(seconds)}s`;
            } else {
                timerElement.textContent = `${format(days)}d ${format(hours)}h ${format(minutes)}m ${format(seconds)}s`;
            }
        };

        const intervalId = setInterval(() => {
            const now = new Date().getTime();
            const distance = targetDate.getTime() - now;

            if (distance < 0) {
                console.log(`Timer ${timerId} (Chart: ${chartType}) atingiu zero. Salvando dados anteriores e recalculando.`);
                saveChartDataToLocalStorage(chartType);
                targetDate = calculateTargetDate();

                if (chartType === 'music') renderChart('music');
                else if (chartType === 'album') renderChart('album');
                else if (chartType === 'rpg') renderRPGChart();

                 updateTimerDisplay(targetDate.getTime() - new Date().getTime());
                return;
            }

            updateTimerDisplay(distance);
        }, 1000);

        updateTimerDisplay(targetDate.getTime() - new Date().getTime());
    };



    function startAlbumCountdown(targetDateISO, containerId) {
        if (albumCountdownInterval) {
            clearInterval(albumCountdownInterval);
            console.log("Intervalo de contagem regressiva do álbum anterior limpo antes de iniciar novo.");
        }

        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Contêiner de contagem regressiva com ID "${containerId}" não encontrado.`);
            return;
        }

        const targetTime = new Date(targetDateISO).getTime();

        const updateTimer = () => {
            const now = new Date().getTime();
            const distance = targetTime - now;

            if (distance < 0) {
                container.innerHTML = '<p style="color: var(--spotify-green); font-weight: bold;">Lançado!</p>';
                if (albumCountdownInterval) {
                    clearInterval(albumCountdownInterval);
                    albumCountdownInterval = null;
                }

                // --- Auto-refresh Logic ---
                const currentAlbum = [...db.albums, ...db.singles].find(a => a.releaseDate === targetDateISO);
                const albumId = currentAlbum ? currentAlbum.id : null;
                const albumDetailView = document.getElementById('albumDetail');
                // Verifica se a view de detalhe do álbum está visível E se o ID no dataset corresponde ao álbum lançado
                const isStillOnPage = albumId && albumDetailView && !albumDetailView.classList.contains('hidden') && albumDetailView.dataset.albumId === albumId;

                if (isStillOnPage) {
                    console.log("Contagem regressiva do álbum finalizada, atualizando a view...");
                    openAlbumDetail(albumId); // Atualiza a view diretamente
                } else {
                    console.log("Contagem regressiva do álbum finalizada, mas a view não pôde ser atualizada automaticamente.");
                }
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            const format = (num) => (num < 10 ? '0' + num : num);

            container.innerHTML = `
                <div class="countdown-item"><span>${format(days)}</span><label>Dias</label></div>
                <div class="countdown-item"><span>${format(hours)}</span><label>Horas</label></div>
                <div class="countdown-item"><span>${format(minutes)}</span><label>Minutos</label></div>
                <div class="countdown-item"><span>${format(seconds)}</span><label>Segundos</label></div>
            `;
        };

        updateTimer();
        albumCountdownInterval = setInterval(updateTimer, 1000);
        console.log("Novo intervalo de contagem regressiva do álbum iniciado:", albumCountdownInterval);
    }


    // --- 3. SISTEMA DE RPG ---
    const CHART_TOP_N = 20;
    const STREAMS_PER_POINT = 10000;

    const calculateSimulatedStreams = (points, lastActiveISO) => {
        if (!lastActiveISO || !points || points <= 0) return 0;

        const now = new Date();
        const lastActiveDate = new Date(lastActiveISO);

        if (isNaN(lastActiveDate.getTime())) {
             console.warn(`Data 'LastActive' inválida encontrada: ${lastActiveISO}`);
             return 0;
        }

        const diffMilliseconds = Math.max(0, now - lastActiveDate);
        const diffHours = diffMilliseconds / (1000 * 60 * 60);

        const streamsPerDay = points * STREAMS_PER_POINT;
        const streamsPerHour = streamsPerDay / 24;

        return Math.floor(streamsPerHour * diffHours);
    };

const computeChartData = (artistsArray) => {
        if (!artistsArray) return [];
        return artistsArray
            .map(artist => ({
                id: artist.id,
                name: artist.name,
                img: artist.img, // Assumes img property is already set
                // 'streams' aqui são os streams simulados para ORDENAÇÃO
                streams: calculateSimulatedStreams(artist.RPGPoints, artist.LastActive), 
                points: artist.RPGPoints || 0,
                // Passa os dados para o cálculo de POPULARIDADE
                careerTotalStreams: artist.careerTotalStreams || 0,
                personalPoints: artist.personalPoints || 150
            }))
            .sort((a, b) => (b.streams || 0) - (a.streams || 0))
            .slice(0, CHART_TOP_N);
    };

    function renderRPGChart() {
        const chartData = computeChartData(db.artists);
        const container = document.getElementById('artistsGrid');
        const previousData = previousRpgChartData;

        if (!container) {
            console.error("Contêiner 'artistsGrid' para o chart RPG não encontrado.");
            return;
        }

        if (chartData.length === 0) {
            container.innerHTML = '<p class="empty-state">Nenhum artista no chart RPG no momento.</p>';
            return;
        }

        container.innerHTML = chartData.map((artist, index) => {
            const currentRank = index + 1;
            const previousRank = previousData[artist.id];
            let iconClass = 'fa-minus';
            let trendClass = 'trend-stable';

            if (previousRank === undefined) {
                trendClass = 'trend-new';
            } else if (currentRank < previousRank) {
                iconClass = 'fa-caret-up';
                trendClass = 'trend-up';
           } else if (currentRank > previousRank) {
                iconClass = 'fa-caret-down';
                trendClass = 'trend-down';
            }

            // --- INÍCIO DA LÓGICA DE POPULARIDADE ---
           // artist.streams (agora artist.simulatedStreams) ordena o chart
            // Mas vamos exibir a popularidade real
            const basePopularity = artist.careerTotalStreams;
            const pointsModifier = (artist.personalPoints || 100) / 100;
            const finalPopularity = Math.floor(basePopularity * pointsModifier);
            // --- FIM DA LÓGICA ---

            return `
                <div class="artist-card" data-artist-name="${artist.name}">
                    <span class="rpg-rank">#${currentRank}</span>
                    <span class="chart-rank-indicator rpg-indicator ${trendClass}">
                        <i class="fas ${iconClass}"></i>
                    </span>
                    <img src="${artist.img}" alt="${artist.name}" class="artist-card-img">
                    <p class="artist-card-name">${artist.name}</p>
                                        <span class="artist-card-type">${finalPopularity.toLocaleString('pt-BR')} popularidade</span>
                </div>`;
        }).join('');
    }

    // --- 4. SISTEMA DO ESTÚDIO ---

    /**
     * Popula um elemento editor de tracklist com as faixas fornecidas.
     * @param {HTMLElement} editorElement O elemento <div> (editAlbumTracklistEditor ou albumTracklistEditor)
     * @param {Array} tracks Um array de objetos de música (de release.tracks)
     */
    function populateTracklistEditor(editorElement, tracks) {
        if (!editorElement) return;
        editorElement.innerHTML = ''; // Limpa o editor
        if (!tracks || tracks.length === 0) {
            editorElement.innerHTML = '<p class="empty-state-small">Nenhuma faixa encontrada.</p>';
            return;
        }

        // Ordena as faixas pelo número da faixa antes de popular
        const sortedTracks = [...tracks].sort((a, b) => (a.trackNumber || 99) - (b.trackNumber || 99));

        sortedTracks.forEach(track => {
            // Busca os dados completos da música no db global
            const fullSong = db.songs.find(s => s.id === track.id);
            if (!fullSong) {
                console.warn(`Não foi possível encontrar dados completos para a faixa ${track.id} (${track.title})`);
                return; // Pula se não encontrar dados completos
            }

            // Reconstrói os dados de feats a partir do objeto fullSong
            const featsData = (fullSong.artistIds || [])
                .slice(1) // Pega todos os IDs de artista exceto o primeiro (principal)
                .map(artistId => {
                    const artist = db.artists.find(a => a.id === artistId);
                    return {
                        id: artistId,
                        type: fullSong.collabType || 'Feat.', // Usa o tipo de colaboração original
                        name: artist ? artist.name : '?'
                    };
                });
            
            const newItem = document.createElement('div');
            newItem.className = 'track-list-item-display';
            newItem.dataset.itemId = `existing_${fullSong.id}`; // ID do item na lista
            newItem.dataset.existingSongId = fullSong.id; // ID da música no Airtable
            // Armazena o nome base (sem "feat." para edição)
            newItem.dataset.trackName = fullSong.title.replace(/ \(feat\. .+\)$/i, ''); 
            newItem.dataset.durationStr = fullSong.duration;
            newItem.dataset.trackType = fullSong.trackType;
            newItem.dataset.feats = JSON.stringify(featsData); // Armazena feats originais

            // O título exibido é o nome completo da faixa (com feat., se houver)
            const titleDisplay = `<span class="track-title-display" style="color: var(--spotify-green);">
                <i class="fas fa-link" style="font-size: 10px; margin-right: 5px;" title="Faixa Existente"></i>${fullSong.title}
            </span>`; 

            newItem.innerHTML = `
                <span class="track-number-display">${fullSong.trackNumber || '?'}</span>
                <i class="fas fa-bars drag-handle"></i>
                <div class="track-actions">
                    <button type="button" class="small-btn edit-track-btn" title="Editar tipo de faixa">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button type="button" class="small-btn remove-track-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="track-info-display">
                    ${titleDisplay}
                    <div class="track-details-display">
                        <span class="duration">Duração: ${fullSong.duration}</span>
                        <span class="type">Tipo: ${fullSong.trackType}</span>
                    </div>
                    <div class="feat-list feat-list-display" style="margin-top:5px;">
                        ${featsData.map(f => `<span class="feat-tag-display">${f.type} ${f.name}</span>`).join('')}
                    </div>
                </div>
            `;
            editorElement.appendChild(newItem);
        });
        
        // Atualiza os números após popular todos os itens
        updateTrackNumbers(editorElement); 
    }

    function initializeStudio() {
        console.log("Inicializando listeners do Estúdio...");

        // Login/Logout
        loginButton?.addEventListener('click', () => {
             const username = document.getElementById('usernameInput')?.value;
             const password = document.getElementById('passwordInput')?.value;
             loginPlayer(username, password);
        });
        logoutButton?.addEventListener('click', logoutPlayer);

        // Abas do Estúdio
        studioTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const clickedTab = e.currentTarget;
                const formTarget = clickedTab.dataset.form;

                studioTabs.forEach(t => t.classList.remove('active'));
                studioForms.forEach(f => f.classList.remove('active'));

                clickedTab.classList.add('active');

                let targetElementId;
                if (formTarget === 'single') {
                    targetElementId = 'newSingleForm';
                } else if (formTarget === 'album') {
                    targetElementId = 'newAlbumForm';
                    initAlbumForm();
                } else if (formTarget === 'edit') {
                    targetElementId = 'editReleaseSection';
                    populateEditableReleases();
                    editReleaseListContainer?.classList.remove('hidden');
                    editReleaseForm?.classList.add('hidden');
                }

                const targetElement = document.getElementById(targetElementId);
                if (targetElement) {
                    targetElement.classList.add('active');
                } else {
                    console.error(`Elemento alvo do estúdio com ID "${targetElementId}" não encontrado.`);
                }
            });
        });

        // Modal Feat (Principal)
        confirmFeatBtn?.addEventListener('click', confirmFeat);
        cancelFeatBtn?.addEventListener('click', closeFeatModal);
        // Listener para o botão "Add Feat" do formulário de Single
        newSingleForm?.addEventListener('click', (e) => {
            const addFeatButton = e.target.closest('.add-feat-btn[data-target="singleFeatList"]');
            if (addFeatButton) {
                openFeatModal(addFeatButton);
            }
        });

        // --- Botões do Modal de Faixa do Álbum (Comuns) ---
        saveAlbumTrackBtn?.addEventListener('click', saveAlbumTrack);
        cancelAlbumTrackBtn?.addEventListener('click', closeAlbumTrackModal);

        // --- Botões do Formulário de NOVO Álbum ---
        openAddTrackModalBtn?.addEventListener('click', () => {
            activeTracklistEditor = albumTracklistEditor; // Define o editor ativo
            openAlbumTrackModal();
        });
        openExistingTrackModalBtn?.addEventListener('click', () => {
             activeTracklistEditor = albumTracklistEditor; // Define o editor ativo
             openExistingTrackModal('album');
        });

        // --- Botões do Formulário de EDITAR Lançamento (NOVOS) ---
        openEditAddTrackModalBtn?.addEventListener('click', () => {
            activeTracklistEditor = editAlbumTracklistEditor; // Define o editor ativo
            openAlbumTrackModal();
        });
        openEditExistingTrackModalBtn?.addEventListener('click', () => {
            activeTracklistEditor = editAlbumTracklistEditor; // Define o editor ativo
            openExistingTrackModal('album');
        });

        // Inline Feat Adder
        addInlineFeatBtn?.addEventListener('click', toggleInlineFeatAdder);
        confirmInlineFeatBtn?.addEventListener('click', confirmInlineFeat);
        cancelInlineFeatBtn?.addEventListener('click', cancelInlineFeat);

        // --- Delegação de Eventos para Editores de Tracklist ---
        // Editor do NOVO Álbum
        albumTracklistEditor?.addEventListener('click', (e) => {
            const editButton = e.target.closest('.edit-track-btn');
            const removeButton = e.target.closest('.remove-track-btn');
            const trackItem = e.target.closest('.track-list-item-display');

            if (editButton && trackItem) {
                activeTracklistEditor = albumTracklistEditor; // Define o editor ativo
                openAlbumTrackModal(trackItem);
            } else if (removeButton && trackItem) {
                trackItem.remove();
                updateTrackNumbers(albumTracklistEditor); // Passa o editor correto
            }
        });

        // Editor de EDIÇÃO de Lançamento (NOVO)
        editAlbumTracklistEditor?.addEventListener('click', (e) => {
            const editButton = e.target.closest('.edit-track-btn');
            const removeButton = e.target.closest('.remove-track-btn');
            const trackItem = e.target.closest('.track-list-item-display');

            if (editButton && trackItem) {
                activeTracklistEditor = editAlbumTracklistEditor; // Define o editor ativo
                openAlbumTrackModal(trackItem);
            } else if (removeButton && trackItem) {
                trackItem.remove();
                updateTrackNumbers(editAlbumTracklistEditor); // Passa o editor correto
            }
        });


        // Lista Edit/Delete Release
        editReleaseList?.addEventListener('click', (e) => {
             const editButton = e.target.closest('.edit-release-btn');
             const deleteButton = e.target.closest('.delete-release-btn');

             if (editButton) {
                 const releaseId = editButton.dataset.releaseId;
                 const releaseType = editButton.dataset.releaseType;
                 openEditForm(releaseId, releaseType);
             } else if (deleteButton) {
                 const releaseId = deleteButton.dataset.releaseId;
                 const releaseType = deleteButton.dataset.releaseType;
                 const tableName = deleteButton.dataset.releaseTable;
                 const releaseTitle = deleteButton.closest('.edit-release-item')?.querySelector('.edit-release-title')?.textContent || 'este lançamento';
                 const release = (releaseType === 'album' ? db.albums : db.singles).find(r => r.id === releaseId);
                 const trackIdsToDelete = release?.trackIds || [];
                 openDeleteConfirmModal(releaseId, tableName, releaseTitle, trackIdsToDelete);
             }
        });
        // Formulário de Edição
        editReleaseForm?.addEventListener('submit', handleUpdateRelease);
        cancelEditBtn?.addEventListener('click', () => {
            editReleaseForm?.classList.add('hidden');
            editReleaseListContainer?.classList.remove('hidden');
        });
        // Modal Delete Confirm
        cancelDeleteBtn?.addEventListener('click', closeDeleteConfirmModal);
        confirmDeleteBtn?.addEventListener('click', handleDeleteRelease);

        // Filtro de Artista (Edição)
        editArtistFilterSelect?.addEventListener('change', populateEditableReleases);

        // Submissão de Formulários
        newSingleForm?.addEventListener('submit', handleSingleSubmit);
        newAlbumForm?.addEventListener('submit', handleAlbumSubmit);

        // Modal Tipo de Faixa (Single)
        confirmTrackTypeBtn?.addEventListener('click', () => {
            const selectedType = trackTypeSelect.value;
            if (selectedType) {
                processSingleSubmission(selectedType);
            } else {
                alert("Por favor, selecione um tipo de faixa.");
            }
        });
        cancelTrackTypeBtn?.addEventListener('click', () => {
            trackTypeModal?.classList.add('hidden');
            const btn = document.getElementById('submitNewSingle');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Lançar Single';
            }
        });

        // Single: Mudar Artista -> Atualizar Faixas Existentes
        singleArtistSelect?.addEventListener('change', () => {
             if (toggleExistingSingle?.checked) {
                 populatePlayerTracks('existingTrackSelect');
             }
        });
        // Single: Toggle Nova/Existente
        toggleExistingSingle?.addEventListener('change', () => toggleSingleFormMode(false));

        // Modal Faixa Existente (Álbum)
        // openExistingTrackModalBtn já tratado acima para definir activeTracklistEditor
        existingTrackSearch?.addEventListener('input', populateExistingTrackSearch);
        cancelExistingTrackBtn?.addEventListener('click', closeExistingTrackModal);
        existingTrackResults?.addEventListener('click', handleExistingTrackSelect);

        // Inicializar SortableJS para AMBOS os editores
        initAlbumForm(); // Inicializa o editor do NOVO álbum
        
        // Inicializa o editor de EDIÇÃO
        if (editAlbumTracklistEditor && typeof Sortable !== 'undefined') {
            if (editAlbumTracklistSortable) { // Destroi instância anterior se houver
                editAlbumTracklistSortable.destroy();
            }
            editAlbumTracklistSortable = Sortable.create(editAlbumTracklistEditor, {
                animation: 150,
                handle: '.drag-handle',
                onEnd: () => updateTrackNumbers(editAlbumTracklistEditor) // Passa o editor correto
            });
        } else if (typeof Sortable === 'undefined') {
            console.warn("SortableJS não carregado. Arrastar e soltar desativado para o editor de edição.");
        }

        console.log("Listeners do Estúdio inicializados.");
    }

    function loginPlayer(username, password) {
        if (!username || !password) {
            alert("Por favor, insira nome de usuário e senha.");
            return;
        }
        const foundPlayer = db.players.find(p => p.name.toLowerCase() === username.toLowerCase());

        if (foundPlayer && foundPlayer.password === password) {
            currentPlayer = foundPlayer;
            console.log(`Jogador ${currentPlayer.name} logado com sucesso.`);

            document.getElementById('playerName').textContent = currentPlayer.name;
            loginPrompt?.classList.add('hidden');
            loggedInInfo?.classList.remove('hidden');
            studioLaunchWrapper?.classList.remove('hidden');

            populateArtistSelector(currentPlayer.id);

            if (document.querySelector('.studio-tab-btn[data-form="edit"]')?.classList.contains('active')) {
                populateEditableReleases();
            }

            populatePlayerTracks('existingTrackSelect');

        } else {
            alert("Usuário ou senha inválidos.");
            const passwordInput = document.getElementById('passwordInput');
            if (passwordInput) passwordInput.value = '';
        }
    }

    function logoutPlayer() {
        console.log(`Jogador ${currentPlayer?.name} deslogado.`);
        currentPlayer = null;

        const playerNameElement = document.getElementById('playerName');
        if (playerNameElement) playerNameElement.textContent = '';
        loginPrompt?.classList.remove('hidden');
        loggedInInfo?.classList.add('hidden');
        studioLaunchWrapper?.classList.add('hidden');

        const usernameInput = document.getElementById('usernameInput');
        const passwordInput = document.getElementById('passwordInput');
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';

        if (editReleaseList) editReleaseList.innerHTML = '<p class="empty-state-small">Faça login para ver seus lançamentos.</p>';
        if (editArtistFilterSelect) editArtistFilterSelect.innerHTML = '<option value="all">Todos os Artistas</option>';
        if(singleArtistSelect) singleArtistSelect.innerHTML = '<option value="">Selecione...</option>';
        if(albumArtistSelect) albumArtistSelect.innerHTML = '<option value="">Selecione...</option>';
        if(existingTrackSelect) existingTrackSelect.innerHTML = '<option value="">Selecione um Artista...</option>';

         editReleaseForm?.classList.add('hidden');
         editReleaseListContainer?.classList.remove('hidden');

         if(toggleExistingSingle) toggleExistingSingle.checked = false;
         toggleSingleFormMode(true);

         studioTabs.forEach(t => t.classList.remove('active'));
         studioForms.forEach(f => f.classList.remove('active'));
         document.querySelector('.studio-tab-btn[data-form="single"]')?.classList.add('active');
         document.getElementById('newSingleForm')?.classList.add('active');
    }

    function populateArtistSelector(playerId) {
        const player = db.players.find(p => p.id === playerId);
        if (!player) {
             console.warn(`Jogador com ID ${playerId} não encontrado para popular seletores.`);
             return;
        }

        const playerArtistIds = player.artists || [];
        const optionsHtml = playerArtistIds.map(id => {
            const artist = db.artists.find(a => a.id === id);
            return artist ? `<option value="${artist.id}">${artist.name}</option>` : '';
        }).join('');

        if (singleArtistSelect) {
            singleArtistSelect.innerHTML = `<option value="">Selecione...</option>${optionsHtml}`;
        }
        if (albumArtistSelect) {
            albumArtistSelect.innerHTML = `<option value="">Selecione...</option>${optionsHtml}`;
        }
        if (editArtistFilterSelect) {
            editArtistFilterSelect.innerHTML = `<option value="all">Todos os Artistas</option>${optionsHtml}`;
        }
    }

    // --- Funções de Feat ---
    function populateArtistSelectForFeat(targetSelectElement) {
        let currentMainArtistId = null;
        let selectElement = targetSelectElement;

        // Tenta identificar o artista principal baseado no editor ativo ou formulário
        if (activeTracklistEditor === editAlbumTracklistEditor || editReleaseForm?.classList.contains('active')) {
             // Se estiver editando, busca o ID do artista exibido (não editável)
             const artistDisplay = document.getElementById('editArtistNameDisplay');
             const artistName = artistDisplay?.textContent;
             const artist = db.artists.find(a => a.name === artistName);
             currentMainArtistId = artist ? artist.id : null;
             selectElement = inlineFeatArtistSelect; // Assume inline no modal de faixa
        } else if (activeTracklistEditor === albumTracklistEditor || newAlbumForm?.classList.contains('active')) {
             currentMainArtistId = albumArtistSelect?.value;
             selectElement = inlineFeatArtistSelect; // Assume inline no modal de faixa
        } else if (newSingleForm?.classList.contains('active')) {
            currentMainArtistId = singleArtistSelect?.value;
            selectElement = featArtistSelect; // Usa o modal principal para single
        } else {
             selectElement = featArtistSelect; // Fallback
        }


        if (!selectElement) {
            console.error("Elemento select para artistas de feat não encontrado!");
            return;
        }

        const featOptions = db.artists
            .filter(artist => artist.id !== currentMainArtistId)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(artist => `<option value="${artist.id}">${artist.name}</option>`)
            .join('');

        selectElement.innerHTML = featOptions || '<option value="">Nenhum outro artista disponível</option>';
    }

    function openFeatModal(buttonElement) {
        const targetListId = buttonElement.dataset.target;
        currentFeatTarget = document.getElementById(targetListId);

        if (!currentFeatTarget) {
            console.error(`Elemento alvo para Feat (ID: ${targetListId}) não encontrado.`);
            return;
        }
        if (!featModal) {
             console.error("Modal de Feat principal não encontrado.");
             return;
        }

        populateArtistSelectForFeat(featArtistSelect); // Popula o dropdown no modal principal
        featModal.classList.remove('hidden');
    }

    function closeFeatModal() {
        featModal?.classList.add('hidden');
        currentFeatTarget = null;
        if(featArtistSelect) featArtistSelect.innerHTML = '';
        if(featTypeSelect) featTypeSelect.value = 'Feat.';
    }

    function confirmFeat() {
        const artistId = featArtistSelect?.value;
        const selectedIndex = featArtistSelect?.selectedIndex;
        const artistName = (selectedIndex !== undefined && selectedIndex !== -1)
                            ? featArtistSelect.options[selectedIndex].text
                            : 'Desconhecido';
        const featType = featTypeSelect?.value;

        if (!artistId || !currentFeatTarget) {
            console.error("Confirmação de Feat falhou: ID do artista ou elemento alvo faltando.");
             alert("Erro ao adicionar feat. Selecione um artista.");
            return;
        }

        const tag = document.createElement('span');
        tag.className = 'feat-tag';
        tag.textContent = `${featType} ${artistName}`;
        tag.dataset.artistId = artistId;
        tag.dataset.featType = featType;
        tag.dataset.artistName = artistName;
        tag.addEventListener('click', () => tag.remove());

        currentFeatTarget.appendChild(tag);
        closeFeatModal();
    }

    function toggleInlineFeatAdder() {
        if (!inlineFeatAdder || !addInlineFeatBtn) return;

        const isHidden = inlineFeatAdder.classList.contains('hidden');
        if (isHidden) {
            populateArtistSelectForFeat(inlineFeatArtistSelect);
            inlineFeatAdder.classList.remove('hidden');
            addInlineFeatBtn.innerHTML = '<i class="fas fa-times"></i> Cancelar Feat';
        } else {
            inlineFeatAdder.classList.add('hidden');
            addInlineFeatBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Feat';
             if(inlineFeatArtistSelect) inlineFeatArtistSelect.innerHTML = '';
             if(inlineFeatTypeSelect) inlineFeatTypeSelect.value = 'Feat.';
        }
    }

    function confirmInlineFeat() {
        const artistId = inlineFeatArtistSelect?.value;
        const selectedIndex = inlineFeatArtistSelect?.selectedIndex;
        const artistName = (selectedIndex !== undefined && selectedIndex !== -1)
                             ? inlineFeatArtistSelect.options[selectedIndex].text
                             : 'Desconhecido';
        const featType = inlineFeatTypeSelect?.value;
        const targetList = albumTrackFeatList;

        if (!artistId || !targetList) {
            console.error("Confirmação de Feat inline falhou: ID do artista ou lista alvo faltando.");
            alert("Erro ao adicionar feat inline. Selecione um artista.");
            return;
        }

        const tag = document.createElement('span');
        tag.className = 'feat-tag';
        tag.textContent = `${featType} ${artistName}`;
        tag.dataset.artistId = artistId;
        tag.dataset.featType = featType;
        tag.dataset.artistName = artistName;
        tag.addEventListener('click', () => tag.remove());

        targetList.appendChild(tag);
        toggleInlineFeatAdder();
    }

    function cancelInlineFeat() {
       if(!inlineFeatAdder || !addInlineFeatBtn) return;
        inlineFeatAdder.classList.add('hidden');
        addInlineFeatBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Feat';
        if(inlineFeatArtistSelect) inlineFeatArtistSelect.innerHTML = '';
        if(inlineFeatTypeSelect) inlineFeatTypeSelect.value = 'Feat.';
    }

   // Modal Adicionar/Editar Faixa
    function openAlbumTrackModal(itemToEdit = null) {
        if (!albumTrackModal || !albumTrackNameInput || !albumTrackDurationInput || !albumTrackTypeSelect || !albumTrackFeatList || !editingTrackItemId || !editingTrackExistingId) {
             console.error("Elementos do modal de faixa do álbum não encontrados.");
             return;
        }

        // Resetar campos comuns
        albumTrackNameInput.value = '';
        albumTrackDurationInput.value = '';
        albumTrackTypeSelect.value = 'B-side';
        albumTrackFeatList.innerHTML = '';
        editingTrackItemId.value = '';
        editingTrackExistingId.value = '';
        editingTrackItem = null;

        // Resetar inline feat adder
        inlineFeatAdder?.classList.add('hidden');
        if (addInlineFeatBtn) addInlineFeatBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Feat';

        // Habilitar campos por padrão (serão desabilitados seletivamente)
        albumTrackNameInput.disabled = false;
        albumTrackDurationInput.disabled = false;
        const featSectionElement = albumTrackFeatList.closest('.feat-section');
        if (featSectionElement) featSectionElement.classList.remove('hidden');


        if (itemToEdit) {
            // --- Editando Item Existente ---
            editingTrackItem = itemToEdit;
            editingTrackItemId.value = itemToEdit.dataset.itemId || `temp_edit_${Date.now()}`;

            albumTrackNameInput.value = itemToEdit.dataset.trackName || '';
            albumTrackDurationInput.value = itemToEdit.dataset.durationStr || '';
            albumTrackTypeSelect.value = itemToEdit.dataset.trackType || 'B-side';

            const existingSongId = itemToEdit.dataset.existingSongId;
            const featsToPopulate = JSON.parse(itemToEdit.dataset.feats || '[]');

            if (!existingSongId) {
                 // É uma faixa NOVA sendo editada (ainda não salva no Airtable)
                 albumTrackModalTitle.textContent = 'Editar Faixa (Nova)';
                 albumTrackNameInput.disabled = false; // Pode editar nome
                 albumTrackDurationInput.disabled = false; // Pode editar duração
                 if (featSectionElement) featSectionElement.classList.remove('hidden'); // Garante visibilidade
            } else {
                 // É uma faixa EXISTENTE (linkada) sendo editada
                 albumTrackModalTitle.textContent = 'Editar Faixa (Existente)';
                 editingTrackExistingId.value = existingSongId;
                 
                 // *** MUDANÇA: HABILITA A EDIÇÃO ***
                 albumTrackNameInput.disabled = false;
                 albumTrackDurationInput.disabled = false;
                 if (featSectionElement) featSectionElement.classList.remove('hidden'); // Mostra feats
            }
            
            // Popula os feats (para ambos, novos ou existentes)
             try {
                 featsToPopulate.forEach(f => {
                     const tag = document.createElement('span');
                     tag.className = 'feat-tag';
                     tag.textContent = `${f.type} ${f.name}`;
                     tag.dataset.artistId = f.id;
                     tag.dataset.featType = f.type;
                     tag.dataset.artistName = f.name;
                     tag.addEventListener('click', () => tag.remove());
                     albumTrackFeatList.appendChild(tag);
                 });
             } catch (e) {
                 console.error("Erro ao parsear feats do dataset:", e);
             }

        } else {
            // --- Adicionando Novo Item ---
            albumTrackModalTitle.textContent = 'Adicionar Faixa (Nova)';
            editingTrackItemId.value = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
             if (featSectionElement) featSectionElement.classList.remove('hidden'); // Garante visibilidade
        }

        albumTrackModal.classList.remove('hidden');
    }

    function closeAlbumTrackModal() {
        albumTrackModal?.classList.add('hidden');
        editingTrackItem = null;
        if(editingTrackItemId) editingTrackItemId.value = '';
        if(editingTrackExistingId) editingTrackExistingId.value = '';
        inlineFeatAdder?.classList.add('hidden');
        if (addInlineFeatBtn) addInlineFeatBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Feat';
    }

    // Salva a faixa do modal para a lista (usa activeTracklistEditor)
   // Salva a faixa do modal para a lista (usa activeTracklistEditor)
    function saveAlbumTrack() {
        if (!activeTracklistEditor) {
            console.error("Nenhum editor de tracklist ativo!");
            alert("Erro: Editor de tracklist não encontrado.");
            return;
        }
        if (!albumTrackNameInput || !albumTrackDurationInput || !albumTrackTypeSelect || !albumTrackFeatList || !editingTrackItemId || !editingTrackExistingId) {
             console.error("Elementos necessários para salvar faixa do álbum não encontrados.");
             return;
        }

        let existingSongId = editingTrackExistingId.value; // Get ID from modal
        const name = albumTrackNameInput.value.trim();
        const durationStr = albumTrackDurationInput.value.trim();
        const type = albumTrackTypeSelect.value;
        const durationSec = parseDurationToSeconds(durationStr);
        const itemId = editingTrackItemId.value;
        
        const featTags = albumTrackFeatList.querySelectorAll('.feat-tag');
        const featsData = Array.from(featTags).map(tag => ({
            id: tag.dataset.artistId,
            type: tag.dataset.featType,
            name: tag.dataset.artistName
        }));
        const featsJSON = JSON.stringify(featsData);

        // Validação
        if (!name || !durationStr || durationSec === 0) {
            alert("Nome da faixa e duração (formato MM:SS) são obrigatórios.");
            return;
        }
        if (!type) {
             alert("Tipo de faixa é obrigatório.");
             return;
        }

        let targetElement = editingTrackItem || activeTracklistEditor.querySelector(`[data-item-id="${itemId}"]`);

        // --- LÓGICA DE QUEBRA DE VÍNCULO (Se editou faixa existente) ---
        let linkBroken = false;
        if (existingSongId && editingTrackItem) { // editingTrackItem é o item da lista original
            const originalName = editingTrackItem.dataset.trackName;
            const originalDuration = editingTrackItem.dataset.durationStr;
            const originalFeats = editingTrackItem.dataset.feats || '[]';

            if (name !== originalName || durationStr !== originalDuration || featsJSON !== originalFeats) {
                console.warn(`Modificação detectada em faixa existente (${existingSongId}). Quebrando vínculo.`);
                alert(`Atenção: Você modificou uma faixa existente. Ela será salva como uma NOVA faixa neste álbum e o vínculo com a original será quebrado.`);
                existingSongId = null; // Quebra o vínculo
                linkBroken = true;
            }
        }
        
        // --- Atualiza ou Cria o Item na Lista ---
        if (targetElement) {
            // --- Editando Item Existente na Lista ---
            console.log(`Editando item ${itemId}. Era existente? ${existingSongId ? 'Sim' : 'Não'}. Vínculo quebrado? ${linkBroken}`);

            // SEMPRE atualiza nome, duração e feats no dataset
            targetElement.dataset.trackName = name;
            targetElement.dataset.durationStr = durationStr;
            targetElement.dataset.feats = featsJSON;
            targetElement.dataset.trackType = type;
            
            // Atualiza ou remove o existingSongId
            if (linkBroken) {
                delete targetElement.dataset.existingSongId; // Remove o atributo
            }
            
            // Atualiza exibição
            const titleSpan = targetElement.querySelector('.track-title-display');
            if(titleSpan) {
                 titleSpan.textContent = name; // Sempre atualiza nome
                 if (existingSongId && !linkBroken) {
                     // Mantém ícone e cor
                     if (!titleSpan.querySelector('i.fa-link')) {
                         titleSpan.innerHTML = `<i class="fas fa-link" style="font-size: 10px; margin-right: 5px;" title="Faixa Existente"></i>${name}`;
                     }
                     titleSpan.style.color = 'var(--spotify-green)';
                 } else {
                     // Remove ícone e cor
                     titleSpan.innerHTML = name; // Garante que o ícone se foi
                     titleSpan.style.color = ''; // Cor padrão
                 }
            }

            const detailsDiv = targetElement.querySelector('.track-details-display');
            if (detailsDiv) {
                 const durationSpan = detailsDiv.querySelector('.duration');
                 const typeSpan = detailsDiv.querySelector('.type');
                 if(durationSpan) durationSpan.textContent = `Duração: ${durationStr}`; // Sempre atualiza
                 if(typeSpan) typeSpan.textContent = `Tipo: ${type}`; // Sempre atualiza
            }

            const featDisplay = targetElement.querySelector('.feat-list-display');
            if (featDisplay) {
                 featDisplay.innerHTML = featsData.map(f => `<span class="feat-tag-display">${f.type} ${f.name}</span>`).join(''); // Sempre atualiza
            }

        } else {
            // --- Adicionando Novo Item na Lista ---
            console.log(`Adicionando novo item ${itemId}`);
            const newItem = document.createElement('div');
            newItem.className = 'track-list-item-display';
            newItem.dataset.itemId = itemId;
            newItem.dataset.trackName = name;
            newItem.dataset.durationStr = durationStr;
            newItem.dataset.trackType = type;
            newItem.dataset.feats = featsJSON;
            // Sem existingSongId para novos

            newItem.innerHTML = `
                <span class="track-number-display"></span>
                <i class="fas fa-bars drag-handle"></i>
                <div class="track-actions">
                    <button type="button" class="small-btn edit-track-btn"><i class="fas fa-pencil-alt"></i></button>
                    <button type="button" class="small-btn remove-track-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="track-info-display">
                    <span class="track-title-display">${name}</span>
                    <div class="track-details-display">
                        <span class="duration">Duração: ${durationStr}</span>
                        <span class="type">Tipo: ${type}</span>
                    </div>
                    <div class="feat-list feat-list-display" style="margin-top:5px;">
                        ${featsData.map(f => `<span class="feat-tag-display">${f.type} ${f.name}</span>`).join('')}
                    </div>
                </div>`;

            const emptyState = activeTracklistEditor.querySelector('.empty-state-small');
            if (emptyState) emptyState.remove();

            activeTracklistEditor.appendChild(newItem);
        }

        updateTrackNumbers(activeTracklistEditor);
        closeAlbumTrackModal();
    }
    // Renumera faixas no editor especificado
    function updateTrackNumbers(editorElement) {
        if (!editorElement) {
             console.warn("updateTrackNumbers chamado sem editorElement");
             return;
        }
        
        const trackItems = editorElement.querySelectorAll('.track-list-item-display');

        if (trackItems.length === 0) {
            if (!editorElement.querySelector('.empty-state-small')) {
                editorElement.innerHTML = '<p class="empty-state-small">Nenhuma faixa adicionada.</p>';
            }
        } else {
            const emptyState = editorElement.querySelector('.empty-state-small');
            if (emptyState) {
                emptyState.remove();
            }
        }

        trackItems.forEach((item, index) => {
            let numberSpan = item.querySelector('.track-number-display');
            if (!numberSpan) {
                console.warn("Criando span de número de faixa ausente para o item:", item.dataset.itemId);
                numberSpan = document.createElement('span');
                numberSpan.className = 'track-number-display';
                const dragHandle = item.querySelector('.drag-handle');
                if (dragHandle) {
                    item.insertBefore(numberSpan, dragHandle);
                } else {
                    item.prepend(numberSpan);
                }
            }
            numberSpan.textContent = `${index + 1}.`;
            numberSpan.style.fontWeight = '700';
            numberSpan.style.color = 'var(--text-secondary)';
            numberSpan.style.width = '25px';
            numberSpan.style.textAlign = 'right';
            numberSpan.style.marginRight = '5px';
        });
    }

    // --- Funções da API Airtable ---
    async function createAirtableRecord(tableName, fields) {
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;
        console.log(`CREATE ${tableName}:`, fields);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fields: fields })
            });
            if (!response.ok) {
                const errorData = await response.json();
                console.error(`Erro Airtable CREATE ${tableName} [${response.status}]:`, JSON.stringify(errorData, null, 2));
                throw new Error(`Erro ${response.status} ao criar registro em ${tableName}: ${errorData?.error?.message || response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Falha na requisição CREATE para ${tableName}:`, error);
            return null;
        }
    }

    async function batchCreateAirtableRecords(tableName, recordsFields) {
        if (!recordsFields || recordsFields.length === 0) return [];

        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;
        const MAX_RECORDS_PER_REQUEST = 10;
        const createdRecords = [];

        for (let i = 0; i < recordsFields.length; i += MAX_RECORDS_PER_REQUEST) {
            const chunk = recordsFields.slice(i, i + MAX_RECORDS_PER_REQUEST);
            const payload = {
                records: chunk.map(fields => ({ fields }))
            };
            console.log(`Enviando lote CREATE para ${tableName} (Tamanho: ${chunk.length})`);

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error(`Erro no lote CREATE para ${tableName} [${response.status}]:`, JSON.stringify(errorData, null, 2));
                    throw new Error(`Erro ${response.status} no lote CREATE para ${tableName}`);
                }
                const data = await response.json();
                if (data.records) {
                    createdRecords.push(...data.records);
                }
            } catch (error) {
                console.error(`Falha na requisição do lote CREATE para ${tableName}:`, error);
                return null;
            }
        }
        console.log(`Lote CREATE para ${tableName} concluído. ${createdRecords.length} registros criados.`);
        return createdRecords;
    }

    async function updateAirtableRecord(tableName, recordId, fields) {
        if (!recordId) {
             console.error(`UPDATE ${tableName}: ID do registro não fornecido.`);
             return null;
        }
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${recordId}`;
         console.log(`UPDATE ${tableName} ID ${recordId}:`, fields);
        try {
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fields: fields })
            });
            if (!response.ok) {
                const errorData = await response.json();
                console.error(`Erro Airtable UPDATE ${tableName} (ID: ${recordId}) [${response.status}]:`, JSON.stringify(errorData, null, 2));
                throw new Error(`Erro ${response.status} ao atualizar registro ${recordId} em ${tableName}: ${errorData?.error?.message || response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Falha na requisição UPDATE para ${tableName} (ID: ${recordId}):`, error);
            return null;
        }
    }

    async function batchUpdateAirtableRecords(tableName, recordsToUpdate) {
        if (!recordsToUpdate || recordsToUpdate.length === 0) return [];

        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;
        const MAX_RECORDS_PER_REQUEST = 10;
        const updatedRecords = [];

        for (let i = 0; i < recordsToUpdate.length; i += MAX_RECORDS_PER_REQUEST) {
            const chunk = recordsToUpdate.slice(i, i + MAX_RECORDS_PER_REQUEST);
            const payload = {
                records: chunk
            };
            console.log(`Enviando lote UPDATE para ${tableName} (Tamanho: ${chunk.length})`);

            try {
                const response = await fetch(url, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error(`Erro no lote UPDATE para ${tableName} [${response.status}]:`, JSON.stringify(errorData, null, 2));
                    throw new Error(`Erro ${response.status} no lote UPDATE para ${tableName}`);
                }
                const data = await response.json();
                if (data.records) {
                    updatedRecords.push(...data.records);
                }
            } catch (error) {
                console.error(`Falha na requisição do lote UPDATE para ${tableName}:`, error);
                return null;
            }
        }
        console.log(`Lote UPDATE para ${tableName} concluído. ${updatedRecords.length} registros atualizados.`);
        return updatedRecords;
    }

    async function deleteAirtableRecord(tableName, recordId) {
        if (!recordId) {
             console.error(`DELETE ${tableName}: ID do registro não fornecido.`);
             return null;
        }
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${recordId}`;
        console.log(`DELETE ${tableName} ID ${recordId}`);
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`
                }
            });
            if (!response.ok) {
                 if (response.status === 404) {
                     console.warn(`Registro ${recordId} em ${tableName} não encontrado para exclusão (já pode ter sido excluído). Considerando sucesso.`);
                     return { deleted: true, id: recordId }; // Simulate success response structure
                 }
                try {
                    const errorData = await response.json();
                    console.error(`Erro Airtable DELETE ${tableName} (ID: ${recordId}) [${response.status}]:`, JSON.stringify(errorData, null, 2));
                    throw new Error(`Erro ${response.status} ao excluir registro ${recordId} em ${tableName}: ${errorData?.error?.message || response.statusText}`);
                } catch (parseError) {
                     console.error(`Erro Airtable DELETE ${tableName} (ID: ${recordId}), Status: ${response.status}, ${response.statusText}`);
                     throw new Error(`Erro ${response.status} ao excluir registro ${recordId} em ${tableName}`);
                }
            }
             if (response.status === 204 || response.headers.get("content-length") === "0") {
                 console.log(`Registro ${recordId} em ${tableName} excluído com sucesso (Status: ${response.status}).`);
                 return { deleted: true, id: recordId };
             } else {
                 return await response.json();
             }
        } catch (error) {
            console.error(`Falha na requisição DELETE para ${tableName} (ID: ${recordId}):`, error);
            return null;
        }
    }

    async function batchDeleteAirtableRecords(tableName, recordIds) {
        if (!recordIds || recordIds.length === 0) {
            console.log(`Nenhum registro para excluir em lote de ${tableName}.`);
            return { success: true, results: [] };
        }

        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;
        const MAX_RECORDS_PER_REQUEST = 10;
        const deletedResults = [];
        let allBatchesSucceeded = true;

        for (let i = 0; i < recordIds.length; i += MAX_RECORDS_PER_REQUEST) {
            const chunk = recordIds.slice(i, i + MAX_RECORDS_PER_REQUEST);
            const params = chunk.map(id => `records[]=${encodeURIComponent(id)}`).join('&');
            const batchUrl = `${url}?${params}`;

            console.log(`Enviando lote DELETE para ${tableName} (IDs: ${chunk.join(', ')})`);

            try {
                const response = await fetch(batchUrl, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_API_KEY}`
                    }
                });
                if (!response.ok) {
                     allBatchesSucceeded = false;
                    try {
                        const errorData = await response.json();
                        console.error(`Erro no lote DELETE para ${tableName} (IDs: ${chunk.join(', ')}) [${response.status}]:`, JSON.stringify(errorData, null, 2));
                         chunk.forEach(id => deletedResults.push({ id: id, deleted: false, error: errorData }));
                    } catch (parseError) {
                        console.error(`Erro no lote DELETE para ${tableName} (IDs: ${chunk.join(', ')}), Status: ${response.status}, ${response.statusText}`);
                         chunk.forEach(id => deletedResults.push({ id: id, deleted: false, error: `Status ${response.status}` }));
                    }
                    // break; // Uncomment to stop on first batch failure
                } else {
                    if (response.status === 204 || response.headers.get("content-length") === "0") {
                        console.warn(`Lote DELETE para ${tableName} retornou ${response.status} inesperado.`);
                        chunk.forEach(id => deletedResults.push({ id: id, deleted: true }));
                    } else {
                         const data = await response.json();
                         if (data.records) {
                             deletedResults.push(...data.records);
                         } else {
                             console.warn("Formato inesperado na resposta do lote DELETE:", data);
                             chunk.forEach(id => deletedResults.push({ id: id, deleted: true }));
                         }
                    }
                }
            } catch (error) {
                allBatchesSucceeded = false;
                console.error(`Falha na requisição do lote DELETE para ${tableName} (IDs: ${chunk.join(', ')}):`, error);
                 chunk.forEach(id => deletedResults.push({ id: id, deleted: false, error: error.message }));
                // break; // Uncomment to stop on first batch failure
            }
        }
        console.log(`Lote DELETE para ${tableName} concluído. Sucesso geral: ${allBatchesSucceeded}`);
         const overallSuccess = allBatchesSucceeded && deletedResults.every(r => r.deleted);
         return { success: overallSuccess, results: deletedResults };
    }

    function parseDurationToSeconds(durationStr) {
        if (!durationStr || typeof durationStr !== 'string') return 0;
        const parts = durationStr.split(':');
        if (parts.length !== 2) return 0;

        const minutes = parseInt(parts[0], 10);
        const seconds = parseInt(parts[1], 10);

        if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds > 59) {
            return 0;
        }
        return (minutes * 60) + seconds;
    }


    // --- FUNÇÕES DE UI (Estúdio) ---
    function populatePlayerTracks(selectElementId) {
        const selectElement = document.getElementById(selectElementId);
        if (!selectElement) {
            console.error(`Elemento select com ID "${selectElementId}" não encontrado.`);
            return;
        }

        const selectedArtistId = singleArtistSelect?.value;

        if (!currentPlayer) {
            selectElement.innerHTML = '<option value="">Faça login primeiro</option>';
            selectElement.disabled = true;
            return;
        }
        if (!selectedArtistId) {
            selectElement.innerHTML = '<option value="">Selecione um Artista primeiro</option>';
            selectElement.disabled = true;
            return;
        }

        const artistSongs = db.songs
            .filter(song => song.artistIds && song.artistIds.includes(selectedArtistId))
            .sort((a, b) => (b.totalStreams || 0) - (a.totalStreams || 0));

        if (artistSongs.length === 0) {
            selectElement.innerHTML = '<option value="">Nenhuma faixa encontrada para este artista</option>';
            selectElement.disabled = true;
        } else {
            selectElement.innerHTML = '<option value="">Selecione uma faixa existente...</option>';
            selectElement.innerHTML += artistSongs.map(song => {
                const primaryReleaseId = song.albumId;
                let releaseName = '(Avulsa)';
                if (primaryReleaseId) {
                    const release = [...db.albums, ...db.singles].find(r => r.id === primaryReleaseId);
                    if (release) releaseName = `(${release.title})`;
                }
                return `<option value="${song.id}">${song.title} ${releaseName}</option>`;
            }).join('');
            selectElement.disabled = false;
        }
    }

    function toggleSingleFormMode(isResetting = false) {
        if (!toggleExistingSingle || !newTrackInfoGroup || !existingTrackGroup || !singleFeatSection || !existingTrackSelect) {
             console.error("Elementos necessários para alternar modo do formulário de single não encontrados.");
             return;
        }

        const useExisting = isResetting ? false : toggleExistingSingle.checked;

        if (useExisting) {
            newTrackInfoGroup.classList.add('hidden');
            existingTrackGroup.classList.remove('hidden');
            singleFeatSection.classList.add('hidden');

            document.getElementById('trackName')?.removeAttribute('required');
            document.getElementById('trackDuration')?.removeAttribute('required');
            existingTrackSelect.setAttribute('required', 'required');

             if (existingTrackSelect.options.length <= 1 || existingTrackSelect.options[0]?.value === "") {
                  populatePlayerTracks('existingTrackSelect');
             }
        } else {
            newTrackInfoGroup.classList.remove('hidden');
            existingTrackGroup.classList.add('hidden');
            singleFeatSection.classList.remove('hidden');

            document.getElementById('trackName')?.setAttribute('required', 'required');
            document.getElementById('trackDuration')?.setAttribute('required', 'required');
            existingTrackSelect.removeAttribute('required');
        }

        if (isResetting) {
            toggleExistingSingle.checked = false;
            existingTrackSelect.value = '';
            if(existingSingleTrackId) existingSingleTrackId.value = '';
            const trackNameInput = document.getElementById('trackName');
            const trackDurationInput = document.getElementById('trackDuration');
            if (trackNameInput) trackNameInput.value = '';
            if (trackDurationInput) trackDurationInput.value = '';
            const featList = document.getElementById('singleFeatList');
            if (featList) featList.innerHTML = '';
        }
    }

    function openExistingTrackModal(context) { // context is 'album'
        if (!currentPlayer) {
            alert("Faça login para adicionar faixas existentes.");
            return;
        }
        // Usa o artista do editor ativo
        let activeArtistId = null;
        if(activeTracklistEditor === albumTracklistEditor){
            activeArtistId = albumArtistSelect?.value;
        } else if (activeTracklistEditor === editAlbumTracklistEditor){
             const artistDisplay = document.getElementById('editArtistNameDisplay');
             const artistName = artistDisplay?.textContent;
             const artist = db.artists.find(a => a.name === artistName);
             activeArtistId = artist ? artist.id : null;
        }

         if (!activeArtistId) {
              alert("Por favor, selecione primeiro o Artista Principal do álbum/EP.");
              return;
         }

        existingTrackModalContext = context;
        if(existingTrackSearch) existingTrackSearch.value = '';
        populateExistingTrackSearch();
        existingTrackModal?.classList.remove('hidden');
    }

    function closeExistingTrackModal() {
        existingTrackModal?.classList.add('hidden');
        if(existingTrackSearch) existingTrackSearch.value = '';
        if(existingTrackResults) existingTrackResults.innerHTML = '<p class="empty-state-small">Busque por uma faixa.</p>';
    }

    function populateExistingTrackSearch() {
        if (!existingTrackResults) return;

        if (!currentPlayer) {
            existingTrackResults.innerHTML = '<p class="empty-state-small">Faça login para buscar.</p>';
            return;
        }

        // Usa o artista do editor ativo
        let selectedArtistId = null;
        if(activeTracklistEditor === albumTracklistEditor){
            selectedArtistId = albumArtistSelect?.value;
        } else if (activeTracklistEditor === editAlbumTracklistEditor){
             const artistDisplay = document.getElementById('editArtistNameDisplay');
             const artistName = artistDisplay?.textContent;
             const artist = db.artists.find(a => a.name === artistName);
             selectedArtistId = artist ? artist.id : null;
        }


        if (!selectedArtistId) {
            existingTrackResults.innerHTML = '<p class="empty-state-small">Selecione um Artista no formulário primeiro.</p>';
            return;
        }

        const query = existingTrackSearch?.value.toLowerCase().trim() || '';

        const filteredSongs = db.songs
            .filter(song => {
                const isArtistSong = song.artistIds && song.artistIds.includes(selectedArtistId);
                const matchesQuery = query === '' || song.title.toLowerCase().includes(query);
                return isArtistSong && matchesQuery;
            })
            .sort((a, b) => (b.totalStreams || 0) - (a.totalStreams || 0));

        if (filteredSongs.length === 0) {
            existingTrackResults.innerHTML = query ?
                '<p class="empty-state-small">Nenhuma faixa encontrada para esta busca.</p>' :
                '<p class="empty-state-small">Nenhuma faixa encontrada para este artista.</p>';
        } else {
            existingTrackResults.innerHTML = filteredSongs.map(song => `
                <div class="existing-track-item" data-song-id="${song.id}" title="Adicionar '${song.title}'">
                    <img src="${song.cover || getCoverUrl(song.albumId)}" alt="${song.title}">
                    <div class="existing-track-item-info">
                        <span class="existing-track-item-title">${song.title}</span>
                        <span class="existing-track-item-artist">${song.artist}</span>
                    </div>
                     <i class="fas fa-plus add-icon"></i>
                </div>
            `).join('');
        }
    }

    function handleExistingTrackSelect(event) {
        const selectedItem = event.target.closest('.existing-track-item');
        if (!selectedItem) return;

        const songId = selectedItem.dataset.songId;
        if (!songId) return;

        if (existingTrackModalContext === 'album') {
            addExistingTrackToAlbum(songId); // Usa activeTracklistEditor
        } else {
            console.warn(`Contexto não suportado para seleção de faixa existente: ${existingTrackModalContext}`);
        }
    }

    // Adiciona faixa existente ao editor ativo
    function addExistingTrackToAlbum(songId) {
        const song = db.songs.find(s => s.id === songId);
        if (!song) {
            alert("Erro: Música selecionada não encontrada nos dados locais.");
            console.error(`Tentativa de adicionar faixa existente com ID ${songId} falhou.`);
            return;
        }
        if (!activeTracklistEditor) {
            console.error("Editor de tracklist não encontrado ou não ativo.");
            return;
        }

        if (activeTracklistEditor.querySelector(`[data-existing-song-id="${song.id}"]`)) {
            alert("Esta música já foi adicionada à tracklist.");
            return;
        }

        const featsData = (song.artistIds || [])
            .slice(1)
            .map(artistId => {
                const artist = db.artists.find(a => a.id === artistId);
                return {
                    id: artistId,
                    type: song.collabType || 'Feat.',
                    name: artist ? artist.name : '?'
                };
            });

        const newItem = document.createElement('div');
        newItem.className = 'track-list-item-display';
        newItem.dataset.itemId = `existing_${song.id}`;
        newItem.dataset.existingSongId = song.id;
        newItem.dataset.trackName = song.title.replace(/ \(feat\. .+\)$/i, '');
        newItem.dataset.durationStr = song.duration;
        newItem.dataset.trackType = song.trackType;
        newItem.dataset.feats = JSON.stringify(featsData);

        const titleDisplay = `<span class="track-title-display" style="color: var(--spotify-green);">
            <i class="fas fa-link" style="font-size: 10px; margin-right: 5px;" title="Faixa Existente"></i>${song.title}
        </span>`;

        newItem.innerHTML = `
            <span class="track-number-display"></span>
            <i class="fas fa-bars drag-handle"></i>
            <div class="track-actions">
                <button type="button" class="small-btn edit-track-btn" title="Editar tipo de faixa">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button type="button" class="small-btn remove-track-btn"><i class="fas fa-times"></i></button>
            </div>
            <div class="track-info-display">
                ${titleDisplay}
                <div class="track-details-display">
                    <span class="duration">Duração: ${song.duration}</span>
                    <span class="type">Tipo: ${song.trackType}</span>
                </div>
                <div class="feat-list feat-list-display" style="margin-top:5px;">
                    ${featsData.map(f => `<span class="feat-tag-display">${f.type} ${f.name}</span>`).join('')}
                </div>
            </div>
        `;

        const emptyState = activeTracklistEditor.querySelector('.empty-state-small');
        if (emptyState) emptyState.remove();

        activeTracklistEditor.appendChild(newItem);
        updateTrackNumbers(activeTracklistEditor); // Usa editor ativo
        closeExistingTrackModal();
    }


    // --- FUNÇÕES DE SUBMISSÃO ---
     async function handleSingleSubmit(event) {
          event.preventDefault();
          const submitButton = document.getElementById('submitNewSingle');
          if (!submitButton) return;

          // --- Validation ---
          const isExisting = toggleExistingSingle?.checked;
          const artistId = singleArtistSelect?.value;
          const title = document.getElementById('singleTitle')?.value;
          const coverUrl = document.getElementById('singleCoverUrl')?.value;
          const releaseDateTimeLocal = singleReleaseDateInput?.value;

          if (!artistId || !title || !coverUrl || !releaseDateTimeLocal) {
               alert("Preencha todos os campos do single (Artista, Nome, Capa, Data/Hora).");
               return;
          }

          if (isExisting) {
               const existingSongId = existingTrackSelect?.value;
               if (!existingSongId) {
                    alert("Selecione uma faixa existente para promover como single.");
                    return;
               }
               if(existingSingleTrackId) existingSingleTrackId.value = existingSongId;

          } else {
               const trackName = document.getElementById('trackName')?.value;
               const trackDuration = document.getElementById('trackDuration')?.value;
               if (!trackName || !trackDuration || parseDurationToSeconds(trackDuration) === 0) {
                    alert("Preencha o nome e a duração (MM:SS) válidos para a nova faixa.");
                    return;
               }
                 if(existingSingleTrackId) existingSingleTrackId.value = '';
          }

          submitButton.disabled = true;
          submitButton.textContent = 'Aguardando Tipo...';

          trackTypeModal?.classList.remove('hidden');
     }

     async function processSingleSubmission(trackType) {
          const submitButton = document.getElementById('submitNewSingle');
          trackTypeModal?.classList.add('hidden');
          if (submitButton) submitButton.textContent = 'Enviando...';

          try {
               const artistId = singleArtistSelect.value;
               const title = document.getElementById('singleTitle').value;
               const coverUrl = document.getElementById('singleCoverUrl').value;
               const releaseDateTimeLocal = singleReleaseDateInput.value;
               const existingSongId = existingSingleTrackId.value;

               // Converte YYYY-MM-DDTHH:MM para YYYY-MM-DD para Airtable
               const releaseDateISO = releaseDateTimeLocal.split('T')[0];
                if (isNaN(new Date(releaseDateISO).getTime())) {
                    throw new Error("Data/Hora de lançamento inválida após conversão.");
                }

               // --- Step 1: Create Single/EP Record ---
               const singleRecordFields = {
                   "Nome do Single/EP": title,
                   "Artista": [artistId],
                   "Capa": [{ "url": coverUrl }],
                   "Data de Lançamento": releaseDateISO
               };
               const singleResponse = await createAirtableRecord('Singles e EPs', singleRecordFields);

               if (!singleResponse || !singleResponse.id) {
                   throw new Error("Falha ao criar o registro do Single/EP no Airtable.");
               }
               const newSingleId = singleResponse.id;
               console.log(`Registro Single/EP criado com ID: ${newSingleId}`);

               // --- Step 2: Create or Update Music Record ---
               let musicRecordId = null;
               if (existingSongId) {
                   // --- Update Existing ---
                   console.log(`Atualizando faixa existente ID: ${existingSongId} para vincular ao novo single ${newSingleId}`);
                   const songData = db.songs.find(s => s.id === existingSongId);
                   const existingSingleLinks = songData?.singleIds || [];
                   const updatedSingleLinks = [...new Set([...existingSingleLinks, newSingleId])];

                   const musicUpdateFields = {
                        "Singles e EPs": updatedSingleLinks,
                        "Tipo de Faixa": trackType
                   };
                   const musicUpdateResponse = await updateAirtableRecord('Músicas', existingSongId, musicUpdateFields);
                   if (!musicUpdateResponse || !musicUpdateResponse.id) {
                        console.error(`Falha ao ATUALIZAR a música ${existingSongId} para vincular ao single ${newSingleId}.`);
                        await deleteAirtableRecord('Singles e EPs', newSingleId); // Rollback
                        throw new Error("Falha ao atualizar a música existente. O single foi removido.");
                   }
                    musicRecordId = musicUpdateResponse.id;
                   console.log(`Música ${musicRecordId} atualizada com sucesso.`);

               } else {
                   // --- Create New ---
                   console.log(`Criando nova faixa para o single ${newSingleId}`);
                   const trackName = document.getElementById('trackName').value;
                   const trackDurationStr = document.getElementById('trackDuration').value;
                   const trackDurationSec = parseDurationToSeconds(trackDurationStr);

                   const featTags = document.querySelectorAll('#singleFeatList .feat-tag');
                   let finalArtistIds = [artistId];
                   let collaborationType = null;
                   let finalTrackName = trackName;
                   let featNames = [];

                   if (featTags.length > 0) {
                        collaborationType = featTags[0].dataset.featType;
                        featTags.forEach(tag => {
                            finalArtistIds.push(tag.dataset.artistId);
                            featNames.push(tag.dataset.artistName);
                        });
                        if (collaborationType === "Feat.") {
                            finalTrackName = `${trackName} (feat. ${featNames.join(', ')})`;
                        }
                   }

                   const musicCreateFields = {
                       "Nome da Faixa": finalTrackName,
                       "Artista": finalArtistIds,
                       "Duração": trackDurationSec,
                       "Nº da Faixa": 1,
                       "Singles e EPs": [newSingleId],
                       "Tipo de Faixa": trackType,
                        ...(collaborationType && { "Tipo de Colaboração": collaborationType })
                   };

                   const musicCreateResponse = await createAirtableRecord('Músicas', musicCreateFields);
                   if (!musicCreateResponse || !musicCreateResponse.id) {
                        console.error(`Falha ao CRIAR a música para o single ${newSingleId}.`);
                        await deleteAirtableRecord('Singles e EPs', newSingleId); // Rollback
                       throw new Error("Falha ao criar a nova música. O single foi removido.");
                   }
                    musicRecordId = musicCreateResponse.id;
                   console.log(`Nova música ${musicRecordId} criada com sucesso.`);
               }

               // --- Step 3: Success ---
               alert("Single lançado com sucesso!");
               newSingleForm?.reset();

               if (singleReleaseDateInput) {
                    const now = new Date();
                    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                    now.setSeconds(0); now.setMilliseconds(0);
                    singleReleaseDateInput.value = now.toISOString().slice(0, 16);
               }
               const featList = document.getElementById('singleFeatList');
               if(featList) featList.innerHTML = '';
               toggleSingleFormMode(true);

               await refreshAllData();

          } catch (error) {
               alert(`Erro ao lançar o single: ${error.message}. Verifique o console.`);
               console.error("Erro detalhado em processSingleSubmission:", error);
          } finally {
               if (submitButton) {
                   submitButton.disabled = false;
                   submitButton.textContent = 'Lançar Single';
               }
                if(existingSingleTrackId) existingSingleTrackId.value = '';
          }
     }

     function initAlbumForm() {
         if (albumTracklistEditor) {
             albumTracklistEditor.innerHTML = '<p class="empty-state-small">Nenhuma faixa adicionada.</p>';
         }
         updateTrackNumbers(albumTracklistEditor); // Passa o editor correto

         if (albumTracklistEditor && typeof Sortable !== 'undefined') {
             if (albumTracklistSortable) {
                 albumTracklistSortable.destroy();
             }
             albumTracklistSortable = Sortable.create(albumTracklistEditor, {
                 animation: 150,
                 handle: '.drag-handle',
                 onEnd: () => updateTrackNumbers(albumTracklistEditor) // Passa o editor correto
             });
         } else if (typeof Sortable === 'undefined') {
             console.warn("Biblioteca SortableJS não carregada. Funcionalidade de arrastar e soltar tracklist desativada.");
         }
     }

     async function handleAlbumSubmit(event) {
         event.preventDefault();
         const submitButton = document.getElementById('submitNewAlbum');
         if (!submitButton) return;

         submitButton.disabled = true;
         submitButton.textContent = 'Enviando...';
         let isAlbum = false; // Flag para determinar tipo no catch/finally

         try {
             const artistId = albumArtistSelect?.value;
             const title = document.getElementById('albumTitle')?.value;
             const coverUrl = document.getElementById('albumCoverUrl')?.value;
             const releaseDateTimeLocal = albumReleaseDateInput?.value;

             if (!artistId || !title || !coverUrl || !releaseDateTimeLocal) {
                 throw new Error("Preencha todos os campos do Álbum/EP (Artista, Nome, Capa, Data/Hora).");
             }

             const releaseDateISO = releaseDateTimeLocal.split('T')[0];
              if (isNaN(new Date(releaseDateISO).getTime())) {
                  throw new Error("Data/Hora de lançamento inválida.");
              }

             const trackItems = albumTracklistEditor?.querySelectorAll('.track-list-item-display');
             if (!trackItems || trackItems.length === 0) {
                 throw new Error("Adicione pelo menos uma faixa ao Álbum/EP.");
             }

             let totalDurationSeconds = 0;
             const musicRecordsToCreate = [];
             const musicRecordsToUpdate = [];

             for (let i = 0; i < trackItems.length; i++) {
                 const item = trackItems[i];
                 const existingSongId = item.dataset.existingSongId;
                 const name = item.dataset.trackName;
                 const durationStr = item.dataset.durationStr;
                 const type = item.dataset.trackType;
                 let feats = [];
                 if (!existingSongId) {
                     try { feats = JSON.parse(item.dataset.feats || '[]'); } catch (e) {}
                 }
                 const durationSec = parseDurationToSeconds(durationStr);

                 if (!name || !durationStr || durationSec === 0) {
                     throw new Error(`Dados inválidos na Faixa ${i + 1}. Verifique nome e duração (MM:SS).`);
                 }
                 totalDurationSeconds += durationSec;

                 if (existingSongId) {
                     musicRecordsToUpdate.push({
                         id: existingSongId,
                         fields: {
                             "Nº da Faixa": i + 1,
                             "Tipo de Faixa": type
                         }
                     });
                 } else {
                     let finalTrackName = name;
                     let finalArtistIds = [artistId];
                     let collaborationType = null;
                     if (feats.length > 0) {
                         collaborationType = feats[0].type;
                         finalArtistIds = [artistId, ...feats.map(f => f.id)];
                         if (collaborationType === "Feat.") {
                             finalTrackName = `${name} (feat. ${feats.map(f => f.name).join(', ')})`;
                         }
                     }
                     musicRecordsToCreate.push({
                         "Nome da Faixa": finalTrackName,
                         "Artista": finalArtistIds,
                         "Duração": durationSec,
                         "Nº da Faixa": i + 1,
                         "Tipo de Faixa": type,
                          ...(collaborationType && { "Tipo de Colaboração": collaborationType })
                     });
                 }
             }

             const IS_ALBUM_THRESHOLD_SECONDS = 30 * 60;
             isAlbum = totalDurationSeconds >= IS_ALBUM_THRESHOLD_SECONDS; // Atualiza a flag
             const targetTableName = isAlbum ? 'Álbuns' : 'Singles e EPs';
             const nameFieldName = isAlbum ? 'Nome do Álbum' : 'Nome do Single/EP';
             const coverFieldName = isAlbum ? 'Capa do Álbum' : 'Capa';
             const linkFieldName = isAlbum ? 'Álbuns' : 'Singles e EPs';

             console.log(`Criando registro em ${targetTableName}...`);
             const releaseRecordFields = {
                 [nameFieldName]: title,
                 "Artista": [artistId],
                 [coverFieldName]: [{ "url": coverUrl }],
                 "Data de Lançamento": releaseDateISO
             };
             const releaseResponse = await createAirtableRecord(targetTableName, releaseRecordFields);

             if (!releaseResponse || !releaseResponse.id) {
                 throw new Error(`Falha ao criar o registro ${isAlbum ? 'do Álbum' : 'do EP'} no Airtable.`);
             }
             const newReleaseId = releaseResponse.id;
             console.log(`${isAlbum ? 'Álbum' : 'EP'} criado com ID: ${newReleaseId}`);

             musicRecordsToCreate.forEach(record => { record[linkFieldName] = [newReleaseId]; });
             musicRecordsToUpdate.forEach(record => {
                  const originalSong = db.songs.find(s => s.id === record.id);
                  const existingLinks = (isAlbum ? originalSong?.albumIds : originalSong?.singleIds) || [];
                  record.fields[linkFieldName] = [...new Set([...existingLinks, newReleaseId])];
             });

             let createdMusicResult = null;
             let updatedMusicResult = null;
             let allMusicOpsSucceeded = true;

             if (musicRecordsToCreate.length > 0) {
                 console.log(`Criando ${musicRecordsToCreate.length} novas músicas...`);
                 createdMusicResult = await batchCreateAirtableRecords('Músicas', musicRecordsToCreate);
                 if (!createdMusicResult || createdMusicResult.length !== musicRecordsToCreate.length) {
                     allMusicOpsSucceeded = false;
                     console.error("Falha ao criar uma ou mais músicas novas no lote.");
                 }
             }
             if (musicRecordsToUpdate.length > 0) {
                 console.log(`Atualizando ${musicRecordsToUpdate.length} músicas existentes...`);
                 updatedMusicResult = await batchUpdateAirtableRecords('Músicas', musicRecordsToUpdate);
                 if (!updatedMusicResult || updatedMusicResult.length !== musicRecordsToUpdate.length) {
                     allMusicOpsSucceeded = false;
                     console.error("Falha ao atualizar uma ou mais músicas existentes no lote.");
                 }
             }

             if (!allMusicOpsSucceeded) {
                 alert(`${isAlbum ? 'Álbum' : 'EP'} lançado, mas ocorreu um erro ao criar/atualizar uma ou mais faixas. Verifique o console.`);
             } else {
                 alert(`${isAlbum ? 'Álbum' : 'EP'} lançado com sucesso!`);
             }

             newAlbumForm?.reset();
             if (albumReleaseDateInput) {
                 const now = new Date();
                 now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                 now.setSeconds(0); now.setMilliseconds(0);
                 albumReleaseDateInput.value = now.toISOString().slice(0, 16);
             }
             initAlbumForm();
             await refreshAllData();

         } catch (error) {
             alert(`Erro ao lançar ${isAlbum ? 'o Álbum' : 'o EP'}: ${error.message}. Verifique o console.`);
             console.error(`Erro detalhado em handleAlbumSubmit:`, error);
         } finally {
             submitButton.disabled = false;
             // Usa o valor final de isAlbum para definir o texto
             submitButton.textContent = `Lançar ${isAlbum ? 'Álbum' : 'EP'}`;
         }
     }


    // --- FUNÇÕES DE EDIÇÃO/EXCLUSÃO ---

    function populateEditableReleases() {
        if (!editReleaseList) return;

        if (!currentPlayer) {
            editReleaseList.innerHTML = '<p class="empty-state-small">Faça login para ver seus lançamentos.</p>';
            return;
        }

        const selectedArtistId = editArtistFilterSelect?.value;
        const playerArtistIds = currentPlayer.artists || [];

        let releasesToDisplay;

        if (selectedArtistId && selectedArtistId !== 'all') {
            releasesToDisplay = [...db.albums, ...db.singles]
                .filter(release => release.artistId === selectedArtistId);
        } else {
            releasesToDisplay = [...db.albums, ...db.singles]
                .filter(release => playerArtistIds.includes(release.artistId));
        }

        const sortedReleases = releasesToDisplay.sort((a, b) => {
             const dateA = a.releaseDate ? new Date(a.releaseDate) : new Date(0);
             const dateB = b.releaseDate ? new Date(b.releaseDate) : new Date(0);
             return dateB - dateA; // Descending order
        });

        if (sortedReleases.length === 0) {
            editReleaseList.innerHTML = '<p class="empty-state-small">Nenhum lançamento encontrado para este filtro.</p>';
        } else {
            editReleaseList.innerHTML = sortedReleases.map(release => `
                <div class="edit-release-item">
                    <img src="${release.imageUrl}" alt="${release.title}" class="edit-release-cover">
                    <div class="edit-release-info">
                        <span class="edit-release-title">${release.title}</span>
                         <span class="edit-release-artist">
                              ${release.artist} - ${release.releaseDate ? new Date(release.releaseDate).getFullYear() : 'Sem Data'}
                              <span class="release-type-badge ${release.type}">${release.type === 'album' ? 'Álbum' : 'Single/EP'}</span>
                         </span>
                    </div>
                    <div class="action-buttons">
                        <button type="button" class="small-btn edit-release-btn"
                                data-release-id="${release.id}"
                                data-release-type="${release.type}"
                                data-release-table="${release.tableName}">
                            <i class="fas fa-pencil-alt"></i> Editar
                        </button>
                        <button type="button" class="small-btn delete-release-btn"
                                data-release-id="${release.id}"
                                data-release-type="${release.type}"
                                data-release-table="${release.tableName}"
                                data-release-title="${release.title}">
                            <i class="fas fa-trash-alt"></i> Apagar
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    function openEditForm(releaseId, releaseType) {
        const release = (releaseType === 'album' ? db.albums : db.singles).find(r => r.id === releaseId);

        if (!release || !editReleaseForm || !editReleaseId || !editReleaseType || !editReleaseTableName || !editArtistNameDisplay || !editReleaseTitle || !editReleaseCoverUrl || !editReleaseDate) {
            alert("Erro: Lançamento não encontrado ou elementos do formulário de edição faltando.");
            console.error("Falha ao abrir formulário de edição. Release:", release, "Form elements found?", !!editReleaseForm);
            return;
        }

        // Popula campos ocultos
        editReleaseId.value = release.id;
        editReleaseType.value = release.type;
        editReleaseTableName.value = release.tableName;

        // Popula campos visíveis
        editArtistNameDisplay.textContent = release.artist;
        editReleaseTitle.value = release.title;
        editReleaseCoverUrl.value = release.imageUrl;

        // Popula datetime-local
        if (release.releaseDate) {
            try {
                const releaseDateObj = new Date(release.releaseDate);
                releaseDateObj.setMinutes(releaseDateObj.getMinutes() - releaseDateObj.getTimezoneOffset());
                editReleaseDate.value = releaseDateObj.toISOString().slice(0, 16);
            } catch (e) {
                console.error("Erro ao formatar data/hora para edição:", e, "Data original:", release.releaseDate);
                editReleaseDate.value = '';
            }
        } else {
            editReleaseDate.value = '';
        }

// --- LÓGICA DA TRACKLIST ---
// Verifica apenas se os elementos do editor existem
if (!editAlbumTracklistEditor || !editTracklistActions) {
    console.warn("Elementos do editor de tracklist não encontrados.");
    // (Opcional) Você pode esconder se eles não existirem
    if(editAlbumTracklistEditor) editAlbumTracklistEditor.classList.add('hidden');
    if(editTracklistActions) editTracklistActions.classList.add('hidden');
} else {
    // Mostra e popula para TODOS os tipos (Álbuns e Singles/EPs)
    if(editAlbumTracklistEditor) editAlbumTracklistEditor.classList.remove('hidden');
    if(editTracklistActions) editTracklistActions.classList.remove('hidden');
    
    // Popula o editor com as faixas do lançamento (seja álbum ou EP)
    populateTracklistEditor(editAlbumTracklistEditor, release.tracks);
     
     // Reinicia SortableJS para o editor de edição
     if (editAlbumTracklistEditor && typeof Sortable !== 'undefined') {
         if (editAlbumTracklistSortable) {
             editAlbumTracklistSortable.destroy();
         }
         editAlbumTracklistSortable = Sortable.create(editAlbumTracklistEditor, {
             animation: 150,
             handle: '.drag-handle',
             onEnd: () => updateTrackNumbers(editAlbumTracklistEditor)
         });
     }
}

        // Troca visibilidade
        editReleaseListContainer?.classList.add('hidden');
        editReleaseForm.classList.remove('hidden');
    }

    async function handleUpdateRelease(event) {
        event.preventDefault();
        if (!saveEditBtn || !editReleaseId || !editReleaseTableName || !editReleaseTitle || !editReleaseCoverUrl || !editReleaseDate || !editAlbumTracklistEditor) {
            console.error("Elementos do formulário de edição faltando ao tentar salvar.");
            return;
        }

        const recordId = editReleaseId.value;
        const tableName = editReleaseTableName.value;
        const releaseType = editReleaseType.value; // 'album' or 'single'
        const updatedTitle = editReleaseTitle.value.trim();
        const updatedCoverUrl = editReleaseCoverUrl.value.trim();
        const updatedReleaseDateTimeLocal = editReleaseDate.value;

        const originalRelease = (releaseType === 'album' ? db.albums : db.singles).find(r => r.id === recordId);
        if (!originalRelease) {
            alert("Erro: Lançamento original não encontrado nos dados locais.");
            return;
        }
        const artistId = originalRelease.artistId;
        const originalTrackIds = new Set(originalRelease.trackIds || []);

        if (!recordId || !tableName || !updatedTitle || !updatedCoverUrl || !updatedReleaseDateTimeLocal) {
            alert("Erro: Dados inválidos ou faltando para a edição. Verifique todos os campos.");
            return;
        }

        let updatedReleaseDateISO;
        try {
            // Converte YYYY-MM-DDTHH:MM para YYYY-MM-DD
            updatedReleaseDateISO = new Date(updatedReleaseDateTimeLocal).toISOString().split('T')[0];
            if (isNaN(new Date(updatedReleaseDateISO).getTime())) { throw new Error("Data/Hora inválida."); }
        } catch (e) {
            alert("Erro: Data/Hora de lançamento inválida.");
            return;
        }

        saveEditBtn.disabled = true;
        saveEditBtn.textContent = 'Salvando...';

        try {
            // --- Etapa 1: Atualiza o registro principal (Título, Capa, Data) ---
            const titleFieldName = (tableName === 'Álbuns') ? 'Nome do Álbum' : 'Nome do Single/EP';
            const coverFieldName = (tableName === 'Álbuns') ? 'Capa do Álbum' : 'Capa';
            const fieldsToUpdate = {
                [titleFieldName]: updatedTitle,
                [coverFieldName]: [{ "url": updatedCoverUrl }],
                "Data de Lançamento": updatedReleaseDateISO
            };
            const updateResult = await updateAirtableRecord(tableName, recordId, fieldsToUpdate);
            if (!updateResult || !updateResult.id) {
                throw new Error("Falha ao atualizar o registro principal do lançamento.");
            }
            console.log("Registro principal do lançamento (ID: " + recordId + ") atualizado.");

            // --- Etapa 2: Processa a Tracklist (Apenas se for 'album' ou 'single' com tracklist editável) ---
            // Assumindo que tableName 'Singles e EPs' pode conter EPs com tracklist editável
            if (tableName === 'Álbuns' || tableName === 'Singles e EPs') { // Verifica se é um tipo que PODE ter tracklist
                const trackItems = editAlbumTracklistEditor.querySelectorAll('.track-list-item-display');
                
                // Só processa tracklist se o editor estiver visível (ou seja, não era um single simples)
                if (!editAlbumTracklistEditor.classList.contains('hidden')) { 
                    
                    const musicRecordsToCreate = []; // Array de { fields: {...} }
                    const musicRecordsToUpdate = []; // Array de { id: "rec...", fields: {...} }
                    const finalTrackIdsInEditor = new Set(); // Mantém o rastro de todos os IDs de músicas no editor

                    for (let i = 0; i < trackItems.length; i++) {
                        const item = trackItems[i];
                        const existingSongId = item.dataset.existingSongId;
                        const name = item.dataset.trackName;
                        const durationStr = item.dataset.durationStr;
                        const type = item.dataset.trackType;
                        const durationSec = parseDurationToSeconds(durationStr);
                        let feats = [];
                        try { feats = JSON.parse(item.dataset.feats || '[]'); } catch (e) {}

                        if (!name || (durationSec === 0 && !existingSongId) ) { // Duração obrigatória só para novas faixas
                            throw new Error(`Dados inválidos na Faixa ${i + 1} do editor.`);
                        }

                        const linkField = tableName === 'Álbuns' ? 'Álbuns' : 'Singles e EPs';

                        if (existingSongId) {
                            // --- Faixa EXISTENTE ---
                            finalTrackIdsInEditor.add(existingSongId);
                            const originalSong = db.songs.find(s => s.id === existingSongId);
                            
                            const existingLinks = (tableName === 'Álbuns' ? originalSong?.albumIds : originalSong?.singleIds) || [];
                            const updatedLinks = [...new Set([...existingLinks, recordId])];

                            musicRecordsToUpdate.push({
                                id: existingSongId,
                                fields: {
                                    "Nº da Faixa": i + 1, 
                                    "Tipo de Faixa": type, 
                                    [linkField]: updatedLinks // Garante vínculo
                                }
                            });
                        } else {
                            // --- Faixa NOVA ---
                            let finalTrackName = name;
                            let finalArtistIds = [artistId];
                            let collaborationType = null;

                            if (feats.length > 0) {
                                collaborationType = feats[0].type;
                                finalArtistIds = [artistId, ...feats.map(f => f.id)];
                                if (collaborationType === "Feat.") {
                                    finalTrackName = `${name} (feat. ${feats.map(f => f.name).join(', ')})`;
                                }
                            }

                            musicRecordsToCreate.push({
                                "Nome da Faixa": finalTrackName,
                                "Artista": finalArtistIds,
                                "Duração": durationSec,
                                "Nº da Faixa": i + 1,
                                "Tipo de Faixa": type,
                                [linkField]: [recordId], // Vincula a este lançamento
                                ...(collaborationType && { "Tipo de Colaboração": collaborationType })
                            });
                        }
                    } // Fim do loop da tracklist

                    // --- Etapa 3: Criar Novas músicas ---
                    if (musicRecordsToCreate.length > 0) {
                        console.log(`Criando ${musicRecordsToCreate.length} novas músicas...`);
                        const createResult = await batchCreateAirtableRecords('Músicas', musicRecordsToCreate.map(fields => fields));
                        if (!createResult || createResult.length !== musicRecordsToCreate.length) {
                            throw new Error("Falha ao criar uma ou mais faixas novas.");
                        }
                        createResult.forEach(record => finalTrackIdsInEditor.add(record.id));
                        console.log("Novas músicas criadas com sucesso.");
                    }

                    // --- Etapa 4: Encontrar e DESVINCULAR faixas removidas ---
                    const tracksToUnlinkIds = [...originalTrackIds].filter(id => !finalTrackIdsInEditor.has(id));
                    
                    if (tracksToUnlinkIds.length > 0) {
                        console.log(`Desvinculando ${tracksToUnlinkIds.length} músicas removidas...`);
                        const unlinkPayload = [];
                        const linkField = tableName === 'Álbuns' ? 'Álbuns' : 'Singles e EPs';

                        for (const trackId of tracksToUnlinkIds) {
                            const originalSong = db.songs.find(s => s.id === trackId);
                            const existingLinks = (tableName === 'Álbuns' ? originalSong?.albumIds : originalSong?.singleIds) || [];
                            const updatedLinks = existingLinks.filter(linkId => linkId !== recordId); 
                            
                            unlinkPayload.push({
                                id: trackId,
                                fields: { [linkField]: updatedLinks }
                            });
                        }
                        const unlinkResult = await batchUpdateAirtableRecords('Músicas', unlinkPayload);
                        if (!unlinkResult || unlinkResult.length !== unlinkPayload.length) {
                            console.warn("Falha ao desvincular uma ou mais músicas removidas.");
                            // Não lança erro fatal, apenas aviso
                        } else {
                            console.log("Músicas antigas desvinculadas com sucesso.");
                        }
                    }
                    
                    // --- Etapa 5: Atualizar músicas EXISTENTES (vínculos, nº da faixa, tipo) ---
                    if (musicRecordsToUpdate.length > 0) {
                        console.log(`Atualizando ${musicRecordsToUpdate.length} músicas existentes...`);
                        const updateExistingResult = await batchUpdateAirtableRecords('Músicas', musicRecordsToUpdate);
                        if (!updateExistingResult || updateExistingResult.length !== musicRecordsToUpdate.length) {
                            throw new Error("Falha ao atualizar faixas existentes (mudança de link/ordem).");
                        }
                        console.log("Músicas existentes atualizadas com sucesso.");
                    }
                } // Fim do if (editor de tracklist estava visível)
            } // Fim do if (releaseType === 'album' ou 'Singles e EPs')

            // --- Etapa 6: Sucesso ---
            alert("Lançamento atualizado com sucesso!");
            editReleaseForm.classList.add('hidden');
            editReleaseListContainer?.classList.remove('hidden');
            await refreshAllData();

        } catch (error) {
            alert(`Erro ao salvar alterações: ${error.message}. Verifique o console.`);
            console.error("Erro detalhado em handleUpdateRelease:", error);
        } finally {
            saveEditBtn.disabled = false;
            saveEditBtn.textContent = 'Salvar Alterações';
        }
    }


    function openDeleteConfirmModal(recordId, tableName, releaseTitle, trackIds) {
        if (!deleteConfirmModal || !deleteRecordId || !deleteTableName || !deleteReleaseName || !deleteTrackIds) {
             console.error("Elementos do modal de confirmação de exclusão não encontrados.");
             return;
        }

        deleteRecordId.value = recordId;
        deleteTableName.value = tableName;
        deleteReleaseName.textContent = releaseTitle;
        deleteTrackIds.value = JSON.stringify(trackIds || []);

        deleteConfirmModal.classList.remove('hidden');
    }

    function closeDeleteConfirmModal() {
        if (!deleteConfirmModal || !deleteRecordId || !deleteTableName || !deleteReleaseName || !deleteTrackIds) return;
        deleteConfirmModal.classList.add('hidden');
        deleteRecordId.value = '';
        deleteTableName.value = '';
        deleteReleaseName.textContent = '';
        deleteTrackIds.value = '';
    }

    async function handleDeleteRelease() {
        if (!confirmDeleteBtn || !deleteRecordId || !deleteTableName || !deleteTrackIds) {
             console.error("Botão de confirmação ou campos ocultos não encontrados para exclusão.");
             return;
        }

        const recordId = deleteRecordId.value;
        const tableName = deleteTableName.value;
        const trackIdsString = deleteTrackIds.value;
        let associatedTrackIds = [];

        try {
            associatedTrackIds = JSON.parse(trackIdsString || '[]');
        } catch (e) {
            console.error("Erro ao parsear IDs das músicas para exclusão:", e);
            alert("Erro interno ao processar faixas associadas. A exclusão pode falhar ou ser incompleta.");
        }

        if (!recordId || !tableName) {
            alert("Erro: Informações inválidas para exclusão (ID ou Tabela faltando).");
            closeDeleteConfirmModal();
            return;
        }

        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Apagando...';

        try {
            let tracksProcessedSuccessfully = true;

            if (associatedTrackIds.length > 0) {
                console.log(`Processando ${associatedTrackIds.length} músicas associadas...`);
                const updates = [];
                const deletes = [];

                for (const trackId of associatedTrackIds) {
                    const song = db.songs.find(s => s.id === trackId);
                    if (!song) {
                        console.warn(`Música associada com ID ${trackId} não encontrada nos dados locais. Pulando.`);
                        continue;
                    }

                    const albumLinksCount = (song.albumIds || []).length;
                    const singleLinksCount = (song.singleIds || []).length;
                    const totalLinks = albumLinksCount + singleLinksCount;

                    if (totalLinks > 1) {
                        console.log(`Desvinculando música ${trackId} do lançamento ${recordId} em ${tableName}`);
                        const isAlbumTable = tableName === 'Álbuns';
                        const linkField = isAlbumTable ? 'Álbuns' : 'Singles e EPs';
                        const currentLinks = (isAlbumTable ? song.albumIds : song.singleIds) || [];
                        const updatedLinks = currentLinks.filter(linkId => linkId !== recordId);
                        updates.push({ id: trackId, fields: { [linkField]: updatedLinks } });
                    } else {
                        console.log(`Marcando música ${trackId} para exclusão (único vínculo).`);
                        deletes.push(trackId);
                    }
                }

                if (updates.length > 0) {
                    console.log(`Desvinculando ${updates.length} músicas...`);
                    const updateResult = await batchUpdateAirtableRecords('Músicas', updates);
                    if (!updateResult || updateResult.length !== updates.length) {
                        tracksProcessedSuccessfully = false;
                        console.error("Falha ao desvincular uma ou mais músicas no lote.");
                        alert("Atenção: Falha ao desvincular uma ou mais músicas associadas. A exclusão do lançamento principal continuará.");
                    } else {
                        console.log("Músicas desvinculadas com sucesso.");
                    }
                }

                if (deletes.length > 0) {
                    console.log(`Excluindo ${deletes.length} músicas...`);
                    const deleteResult = await batchDeleteAirtableRecords('Músicas', deletes);
                    if (!deleteResult || !deleteResult.success) {
                        tracksProcessedSuccessfully = false;
                        console.error("Falha ao excluir uma ou mais músicas no lote. Resposta:", deleteResult);
                         alert("Atenção: Falha ao excluir uma ou mais músicas associadas. A exclusão do lançamento principal continuará, mas pode deixar músicas órfãs.");
                    } else {
                        console.log("Músicas marcadas para exclusão processadas com sucesso.");
                    }
                }
            }

            console.log(`Excluindo o lançamento principal ${recordId} da tabela ${tableName}...`);
            const releaseDeleteResult = await deleteAirtableRecord(tableName, recordId);

            if (releaseDeleteResult && releaseDeleteResult.deleted) {
                alert("Lançamento apagado com sucesso!");
                closeDeleteConfirmModal();
                await refreshAllData();
            } else {
                 if (!tracksProcessedSuccessfully) {
                     throw new Error("Falha ao apagar o lançamento principal E erro ao processar músicas associadas.");
                 } else {
                     throw new Error("Falha ao apagar o registro principal do lançamento. As músicas associadas podem ter sido desvinculadas/excluídas.");
                 }
            }

        } catch (error) {
            alert(`Erro ao apagar o lançamento: ${error.message}. Verifique o console.`);
            console.error("Erro detalhado em handleDeleteRelease:", error);
             closeDeleteConfirmModal();
        } finally {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Sim, Apagar';
        }
    }


    // --- 5. LÓGICA DO PLAYER DE MÚSICA ---
    function openPlayer(songId, clickedElement) {
       const song = db.songs.find(s => s.id === songId);
       if (!song) {
            console.error(`Música com ID ${songId} não encontrada para tocar.`);
            return;
       }
       console.log("Abrindo player para:", song.title);

       const parentListContainer = clickedElement?.closest('.popular-songs-list, .tracklist-container, .chart-list');

       if (parentListContainer) {
            const songElements = parentListContainer.querySelectorAll('.song-row[data-song-id], .track-row[data-song-id].available, .chart-item[data-song-id]');
            currentQueue = Array.from(songElements)
                                .map(el => db.songs.find(s => s.id === el.dataset.songId))
                                .filter(Boolean);
            console.log(`Fila criada a partir do container: ${currentQueue.length} músicas.`);
       } else {
            currentQueue = [song];
            console.log("Fila criada com apenas a música selecionada.");
       }

       currentQueueIndex = currentQueue.findIndex(s => s.id === songId);

       if (currentQueueIndex === -1) {
            console.warn("Música clicada não encontrada na fila gerada. Tocando apenas ela.");
           currentQueue = [song];
           currentQueueIndex = 0;
       }

       loadSong(song);

       musicPlayerView?.classList.remove('hidden');
       document.body.classList.add('player-open');
       playAudio();
    }

    function closePlayer() {
        musicPlayerView?.classList.add('hidden');
        document.body.classList.remove('player-open');
        if (isPlaying) {
            pauseAudio();
            console.log("Player fechado, áudio pausado.");
        } else {
             console.log("Player fechado.");
        }
    }

    function loadSong(song) {
        if (!song) {
            console.error("Tentativa de carregar música inválida (null ou undefined).");
            return;
        }
        console.log("Carregando música:", song.title);
        currentSong = song;

        if (playerSongTitle) playerSongTitle.textContent = song.title;
        if (playerArtistName) playerArtistName.textContent = formatArtistString(song.artistIds, song.collabType);

        const parentRelease = [...db.albums, ...db.singles].find(r => r.id === song.albumId);
        if (parentRelease) {
            if (playerCoverArt) playerCoverArt.src = parentRelease.imageUrl;
            if (playerAlbumTitle) playerAlbumTitle.textContent = parentRelease.title;
        } else {
            if (playerCoverArt) playerCoverArt.src = 'https://i.imgur.com/AD3MbBi.png';
            if (playerAlbumTitle) playerAlbumTitle.textContent = 'Single Avulso';
        }

        const durationSeconds = song.durationSeconds || 180;

        if (playerSeekBar) {
            playerSeekBar.value = 0;
            playerSeekBar.max = durationSeconds;
        }
        if (playerCurrentTime) playerCurrentTime.textContent = formatTime(0);
        if (playerTotalTime) playerTotalTime.textContent = formatTime(durationSeconds);

        if (isPlaying) {
             if(playerPlayPauseBtn) playerPlayPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
             if(playerPlayPauseBtn) playerPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
        if (playerCurrentTime) playerCurrentTime.textContent = formatTime(0);
    }

    function playAudio() {
        if (!currentSong) return;
        isPlaying = true;
        if (playerPlayPauseBtn) playerPlayPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        console.log("Simulando Play:", currentSong.title);
    }

    function pauseAudio() {
        isPlaying = false;
        if (playerPlayPauseBtn) playerPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        console.log("Simulando Pause:", currentSong?.title);
    }

    function togglePlay() {
        if (isPlaying) {
            pauseAudio();
        } else {
            playAudio();
        }
    }

    function playNext() {
        if (!currentQueue || currentQueue.length === 0 || !currentSong) {
            console.log("PlayNext: Fila vazia ou nenhuma música atual.");
            return;
        }
        console.log("PlayNext: Iniciando...");

        if (repeatMode === 'one') {
            console.log("PlayNext: Modo Repeat One, reiniciando música atual.");
            if (playerSeekBar) playerSeekBar.value = 0;
            if (playerCurrentTime) playerCurrentTime.textContent = formatTime(0);
            playAudio();
            return;
        }

        if (isShuffle) {
            let randomIndex = currentQueueIndex;
             if (currentQueue.length > 1) {
                  do {
                       randomIndex = Math.floor(Math.random() * currentQueue.length);
                  } while (randomIndex === currentQueueIndex);
             }
            currentQueueIndex = randomIndex;
            console.log(`PlayNext: Modo Shuffle, pulando para índice aleatório ${currentQueueIndex}`);
        } else {
            currentQueueIndex++;
            console.log(`PlayNext: Modo Normal, incrementando índice para ${currentQueueIndex}`);
        }

        if (currentQueueIndex >= currentQueue.length) {
            if (repeatMode === 'all') {
                console.log("PlayNext: Fim da fila, modo Repeat All, voltando para o início.");
                currentQueueIndex = 0;
            } else {
                console.log("PlayNext: Fim da fila, sem modo de repetição.");
                currentQueueIndex = currentQueue.length - 1;
                const lastSong = currentQueue[currentQueueIndex];
                if(lastSong) loadSong(lastSong);
                pauseAudio();
                if(playerSeekBar) playerSeekBar.value = playerSeekBar.max;
                if(playerCurrentTime) playerCurrentTime.textContent = formatTime(playerSeekBar.max || 0);
                return;
            }
        }

        const nextSong = currentQueue[currentQueueIndex];
        if (nextSong) {
             loadSong(nextSong);
             if (isPlaying) {
                  playAudio();
             } else {
                 pauseAudio();
             }
        } else {
             console.error(`PlayNext: Música não encontrada no índice ${currentQueueIndex}`);
             pauseAudio();
        }
    }

    function playPrevious() {
         if (!currentQueue || currentQueue.length === 0 || !currentSong) {
              console.log("PlayPrevious: Fila vazia ou nenhuma música atual.");
              return;
         }
        console.log("PlayPrevious: Iniciando...");

        const currentTime = playerSeekBar ? parseFloat(playerSeekBar.value) : 0;
        if (currentTime > 3) {
            console.log("PlayPrevious: Reiniciando música atual (tocada por > 3s).");
            if (playerSeekBar) playerSeekBar.value = 0;
            if (playerCurrentTime) playerCurrentTime.textContent = formatTime(0);
             if(isPlaying) playAudio();
            return;
        }

        if (isShuffle) {
             let randomIndex = currentQueueIndex;
              if (currentQueue.length > 1) {
                   do {
                        randomIndex = Math.floor(Math.random() * currentQueue.length);
                   } while (randomIndex === currentQueueIndex);
              }
             currentQueueIndex = randomIndex;
             console.log(`PlayPrevious: Modo Shuffle, pulando para índice aleatório ${currentQueueIndex}`);

        } else {
            currentQueueIndex--;
            console.log(`PlayPrevious: Modo Normal, decrementando índice para ${currentQueueIndex}`);
        }

        if (currentQueueIndex < 0) {
            if (repeatMode === 'all') {
                console.log("PlayPrevious: Início da fila, modo Repeat All, pulando para o fim.");
                currentQueueIndex = currentQueue.length - 1;
            } else {
                console.log("PlayPrevious: Início da fila, sem modo de repetição, reiniciando primeira música.");
                currentQueueIndex = 0;
                if (playerSeekBar) playerSeekBar.value = 0;
                if (playerCurrentTime) playerCurrentTime.textContent = formatTime(0);
                const firstSong = currentQueue[currentQueueIndex];
                if (firstSong) {
                     loadSong(firstSong);
                     if(isPlaying) playAudio(); else pauseAudio();
                }
                return;
            }
        }

        const prevSong = currentQueue[currentQueueIndex];
        if (prevSong) {
             loadSong(prevSong);
             if (isPlaying) {
                  playAudio();
             } else {
                 pauseAudio();
             }
        } else {
             console.error(`PlayPrevious: Música não encontrada no índice ${currentQueueIndex}`);
             pauseAudio();
        }
    }

    function toggleShuffle() {
        isShuffle = !isShuffle;
        playerShuffleBtn?.classList.toggle('active', isShuffle);
        console.log("Shuffle:", isShuffle ? "Ativado" : "Desativado");
    }

    function toggleRepeat() {
        const repeatIcon = playerRepeatBtn?.querySelector('i');
        if (!repeatIcon) return;

        if (repeatMode === 'none') {
            repeatMode = 'all';
            playerRepeatBtn?.classList.add('active');
            repeatIcon.className = 'fas fa-repeat';
            console.log("Repeat Mode: All");
        } else if (repeatMode === 'all') {
            repeatMode = 'one';
            playerRepeatBtn?.classList.add('active');
            repeatIcon.className = 'fas fa-repeat-1'; // Usando ícone FontAwesome 6
            console.log("Repeat Mode: One");
        } else { // repeatMode === 'one'
            repeatMode = 'none';
            playerRepeatBtn?.classList.remove('active');
            repeatIcon.className = 'fas fa-repeat';
            console.log("Repeat Mode: None");
        }
    }

    function formatTime(totalSeconds) {
        if (isNaN(totalSeconds) || totalSeconds < 0) return "0:00";
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    // --- Simulation Timer ---
    let simulationInterval = null;

    function startSimulationTimer() {
        stopSimulationTimer();
        simulationInterval = setInterval(() => {
            if (isPlaying && playerSeekBar && currentSong) {
                let currentValue = parseFloat(playerSeekBar.value);
                const maxValue = parseFloat(playerSeekBar.max);

                if (currentValue < maxValue) {
                    currentValue += 1;
                    playerSeekBar.value = currentValue;
                    if (playerCurrentTime) playerCurrentTime.textContent = formatTime(currentValue);
                } else {
                    console.log(`Simulação: ${currentSong.title} terminou.`);
                    if (repeatMode === 'one') {
                        console.log("Simulação: Repeat One ativado, reiniciando.");
                        playerSeekBar.value = 0;
                        if (playerCurrentTime) playerCurrentTime.textContent = formatTime(0);
                         playAudio();
                    } else {
                        console.log("Simulação: Chamando playNext().");
                        playNext();
                    }
                }
            }
        }, 1000);
    }

    function stopSimulationTimer() {
        if (simulationInterval) {
            clearInterval(simulationInterval);
            simulationInterval = null;
        }
    }

    function initializePlayerListeners() {
        playerCloseBtn?.addEventListener('click', closePlayer);
        playerPlayPauseBtn?.addEventListener('click', togglePlay);
        playerNextBtn?.addEventListener('click', playNext);
        playerPrevBtn?.addEventListener('click', playPrevious);
        playerShuffleBtn?.addEventListener('click', toggleShuffle);
        playerRepeatBtn?.addEventListener('click', toggleRepeat);

        playerSeekBar?.addEventListener('input', () => {
            if (playerCurrentTime && playerSeekBar) {
                playerCurrentTime.textContent = formatTime(playerSeekBar.value);
            }
        });
        playerSeekBar?.addEventListener('change', () => {
             console.log(`Simulação: Usuário ajustou para ${formatTime(playerSeekBar.value)}`);
             if (isPlaying) {
                  playAudio();
             }
        });

        startSimulationTimer();
        console.log("Listeners do Player inicializados.");
    }



    // --- 6. INICIALIZAÇÃO GERAL ---
    function initializeBodyClickListener() {
        document.body.addEventListener('click', (event) => {
            // Artist Navigation
            const artistCard = event.target.closest('.artist-card[data-artist-name]');
            const artistLink = event.target.closest('.artist-link[data-artist-name]');
            if (artistCard) {
                openArtistDetail(artistCard.dataset.artistName);
                return;
            }
            if (artistLink) {
                event.preventDefault();
                openArtistDetail(artistLink.dataset.artistName);
                return;
            }

// Album/Single Navigation
            const albumCard = event.target.closest('[data-album-id]');
            if (albumCard) {
                // Ignora cliques em botões dentro da lista de edição
                if (event.target.closest('.action-buttons') || albumCard.closest('#editReleaseList')) {
                    return;
                }
                openAlbumDetail(albumCard.dataset.albumId);
                return;
            }

            // Song Playback (Músicas Populares, Tracklists, Charts)
            const songRow = event.target.closest('.song-row[data-song-id], .track-row[data-song-id].available, .chart-item[data-song-id]');
            if (songRow) {
                // Ignora cliques em botões dentro da tracklist do estúdio
                if (event.target.closest('.track-actions button') || songRow.closest('.studio-form-content')) {
                    return;
                }
                openPlayer(songRow.dataset.songId, songRow);
                return;
            }

            // Discography "Ver Mais" Links (na página do artista)
            const discogLink = event.target.closest('.discography-link[data-discog-type]');
            if (discogLink) {
                event.preventDefault();
                openDiscographyDetail(discogLink.dataset.discogType);
                return;
            }

// Botões "Voltar" (em páginas de detalhes)
const backButton = event.target.closest('[data-action="back"]');
if (backButton) {
    console.log("Back button clicked!"); // <--- ADICIONE ESTA LINHA
    event.preventDefault();
    handleBack();
    return;
}

            // Botão "Atualizar"
            const refreshButton = event.target.closest('[data-action="refresh"]');
            if(refreshButton){
                event.preventDefault();
                const icon = refreshButton.querySelector('i');
                if(icon) icon.classList.add('fa-spin');
                refreshButton.disabled = true;

                console.log("Atualização manual iniciada...");
                refreshAllData().finally(() => {
                    if(icon) icon.classList.remove('fa-spin');
                    refreshButton.disabled = false;
                    console.log("Atualização manual concluída.");
                });
                return;
            }

        });
        console.log("Listener de clique principal (delegação) atribuído ao body.");
    }

    function attachNavigationListeners() {
        console.log("Atribuindo listeners de navegação (abas, busca)...");
        const navButtons = document.querySelectorAll('.nav-tab, .bottom-nav-item');
        navButtons.forEach(button => {
            // Remove listener antigo para evitar duplicatas em caso de re-call
            button.removeEventListener('click', switchTab);
            button.addEventListener('click', switchTab);
        });

        if(searchInput) {
            searchInput.removeEventListener('input', handleSearch);
            searchInput.addEventListener('input', handleSearch);
        }
        console.log("Listeners de navegação atribuídos.");
    }

    // --- Função Principal de Inicialização ---
    async function main() {
        document.body.classList.add('loading');
        console.log("Aplicação iniciada.");

        // 1. Inicializar Elementos do DOM
        if (!initializeDOMElements()) {
            console.error("Falha ao inicializar elementos do DOM. Aplicação parada.");
            document.body.classList.remove('loading');
            return; // Para a execução
        }

        // 2. Carregar Dados do Airtable
        const data = await loadAllData();
        if (!data) {
            console.error("Falha ao carregar dados do Airtable. Aplicação parada.");
            document.body.classList.remove('loading');
            return; // Para a execução
        }

        // 3. Processar e Inicializar o Banco de Dados Local (db)
        if (!initializeData(data)) {
            console.error("Falha ao processar dados. Aplicação parada.");
            document.body.classList.remove('loading');
            return; // Para a execução
        }

        // 4. Renderizar Componentes Iniciais (Charts, Grids)
        try {
            console.log("Renderizando componentes iniciais...");
            renderRPGChart();
            renderArtistsGrid('homeGrid', [...(db.artists || [])].sort(() => 0.5 - Math.random()).slice(0, 10));
            renderChart('music');
            renderChart('album');
        } catch (renderError) {
            console.error("Erro durante a renderização inicial:", renderError);
            // Não para, mas a UI pode estar incompleta
        }

        // 5. Configurar Listeners de Eventos
        try {
            attachNavigationListeners();    // Abas de navegação, busca
            initializeBodyClickListener(); // Delegação de cliques (cards, links)
            initializeStudio();            // Listeners específicos do estúdio
            initializePlayerListeners();  // Listeners do player de música
        } catch (listenerError) {
            console.error("Erro ao configurar listeners:", listenerError);
        }

        // 6. Configurar Contadores
        try {
            setupCountdown('rpgChartTimer', 'rpg');
            setupCountdown('musicChartTimer', 'music');
            setupCountdown('albumChartTimer', 'album');
        } catch(countdownError) {
            console.error("Erro ao configurar contadores de chart:", countdownError);
        }

        // 7. Concluir
        switchView('mainView'); // Mostra a view principal
        activateMainViewSection('homeSection'); // Ativa a aba "Início"
        document.body.classList.remove('loading');
        console.log("Aplicação pronta.");
    }

    // Iniciar a aplicação
    main().catch(err => {
        console.error("Erro fatal na função main:", err);
        document.body.innerHTML = '<div style="color: red; padding: 20px;"><h1>Erro Fatal</h1><p>Ocorreu um erro inesperado ao iniciar a aplicação. Verifique o console.</p></div>';
        document.body.classList.remove('loading');
    });

});
