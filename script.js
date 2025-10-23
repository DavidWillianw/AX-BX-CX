document.addEventListener('DOMContentLoaded', async () => {

    // --- VARIÁVEIS GLOBAIS ---
    let db = { artists: [], albums: [], singles: [], songs: [], players: [] };
    let currentPlayer = null;
    let albumTracklistSortable = null;
    let activeArtist = null;
    let currentFeatTarget = null;
    let viewHistory = [];
    // NOVO: Para guardar dados dos charts anteriores
    let previousMusicChartData = {};
    let previousAlbumChartData = {};
    let previousRpgChartData = {}; // Para o chart de artistas RPG

    // --- ELEMENTOS DO DOM ---
    // (IDs permanecem os mesmos, não precisa listar todos aqui)
    let allViews, searchInput, studioView, loginPrompt, /* ... etc ... */ ;

    const AIRTABLE_BASE_ID = 'appG5NOoblUmtSMVI';
    const AIRTABLE_API_KEY = 'pat5T28kjmJ4t6TQG.69bf34509e687fff6a3f76bd52e64518d6c92be8b1ee0a53bcc9f50fedcb5c70';

    // NOVO: Chaves para localStorage
    const PREVIOUS_MUSIC_CHART_KEY = 'spotifyRpg_previousMusicChart';
    const PREVIOUS_ALBUM_CHART_KEY = 'spotifyRpg_previousAlbumChart';
    const PREVIOUS_RPG_CHART_KEY = 'spotifyRpg_previousRpgChart'; // Para o chart RPG

    // --- FUNÇÃO PARA INICIALIZAR ELEMENTOS DO DOM --- (Sem mudanças)
    function initializeDOMElements() { /* ... código inalterado ... */
        console.log("Initializing DOM elements...");
        allViews = document.querySelectorAll('.page-view'); searchInput = document.getElementById('searchInput'); studioView = document.getElementById('studioView'); loginPrompt = document.getElementById('loginPrompt'); loggedInInfo = document.getElementById('loggedInInfo'); playerSelect = document.getElementById('playerSelect'); loginButton = document.getElementById('loginButton'); logoutButton = document.getElementById('logoutButton'); studioLaunchWrapper = document.getElementById('studioLaunchWrapper'); studioTabs = document.querySelectorAll('.studio-tab-btn'); studioForms = document.querySelectorAll('.studio-form-content'); newSingleForm = document.getElementById('newSingleForm'); singleArtistSelect = document.getElementById('singleArtistSelect'); singleReleaseDateInput = document.getElementById('singleReleaseDate'); newAlbumForm = document.getElementById('newAlbumForm'); albumArtistSelect = document.getElementById('albumArtistSelect'); albumReleaseDateInput = document.getElementById('albumReleaseDate'); addTrackButton = document.getElementById('addTrackButton'); albumTracklistEditor = document.getElementById('albumTracklistEditor'); featModal = document.getElementById('featModal'); featArtistSelect = document.getElementById('featArtistSelect'); featTypeSelect = document.getElementById('featTypeSelect'); confirmFeatBtn = document.getElementById('confirmFeatBtn'); cancelFeatBtn = document.getElementById('cancelFeatBtn');
        if (!studioView || !loginPrompt || !playerSelect || !newSingleForm || !newAlbumForm || !featModal || !allViews || allViews.length === 0 || !singleReleaseDateInput || !albumReleaseDateInput) { console.error("ERRO CRÍTICO: Elementos essenciais não encontrados!"); return false; }
        const today = new Date().toISOString().split('T')[0]; singleReleaseDateInput.value = today; albumReleaseDateInput.value = today;
        console.log("DOM elements initialized."); return true;
     }


    // --- 1. CARREGAMENTO DE DADOS ---

    async function fetchAllAirtablePages(baseUrl, fetchOptions) { /* ... código inalterado ... */
        let allRecords = []; let offset = null;
        do { const sep = baseUrl.includes('?')?'&':'?'; const url = offset?`${baseUrl}${sep}offset=${offset}`:baseUrl; const res = await fetch(url, fetchOptions); if (!res.ok) { const txt = await res.text(); console.error(`Falha ${url}: ${res.status}-${txt}`); throw new Error(`Fetch fail ${baseUrl}`); } const data = await res.json(); if (data.records) { allRecords.push(...data.records); } offset = data.offset; } while (offset); return { records: allRecords };
     }

    async function loadAllData() { /* ... código inalterado ... */
         const artistsURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Artists?filterByFormula=%7BArtista%20Principal%7D%3D1`; const albumsURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Álbuns')}`; const musicasURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Músicas')}`; const singlesURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Singles e EPs')}`; const playersURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Jogadores`; const fetchOptions = { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } }; console.log("Carregando dados..."); try { const [artistsData, albumsData, musicasData, singlesData, playersData] = await Promise.all([ fetchAllAirtablePages(artistsURL, fetchOptions), fetchAllAirtablePages(albumsURL, fetchOptions), fetchAllAirtablePages(musicasURL, fetchOptions), fetchAllAirtablePages(singlesURL, fetchOptions), fetchAllAirtablePages(playersURL, fetchOptions) ]); if (!artistsData || !albumsData || !musicasData || !singlesData || !playersData) { throw new Error('Falha ao carregar dados.'); } const musicasMap = new Map(); (musicasData.records || []).forEach(r => { const artistIds = Array.isArray(r.fields['Artista']) ? r.fields['Artista'] : [r.fields['Artista']].filter(Boolean); const pId = (r.fields['Álbuns']?.[0]) || (r.fields['Singles e EPs']?.[0]) || null; musicasMap.set(r.id, { id: r.id, title: r.fields['Nome da Faixa']||'?', duration: r.fields['Duração']?new Date(r.fields['Duração']*1000).toISOString().substr(14,5):"0:00", trackNumber: r.fields['Nº da Faixa']||0, durationSeconds: r.fields['Duração']||0, artistIds: artistIds, collabType: r.fields['Tipo de Colaboração'], albumId: pId, streams: r.fields.Streams||0 }); }); const artistsMapById = new Map(); const artistsList = (artistsData.records || []).map(r => { const a = { id: r.id, name: r.fields.Name||'?', imageUrl: (r.fields['URL da Imagem']?.[0]?.url) || 'https://i.imgur.com/AD3MbBi.png', off: r.fields['Inspirações (Off)']||[], RPGPoints: r.fields.RPGPoints||0, LastActive: r.fields.LastActive||null }; artistsMapById.set(a.id, a.name); return a; }); const formatReleases = (records, isAlbum) => { if (!records) return []; return records.map(r => { const f=r.fields; const id=r.id; const tracks = Array.from(musicasMap.values()).filter(s => s.albumId===id).sort((a,b)=>(a.trackNumber||0)-(b.trackNumber||0)); const dur = tracks.reduce((t, tr) => t+(tr.durationSeconds||0), 0); const artId = Array.isArray(f['Artista']) ? f['Artista'][0] : (f['Artista']||null); const artName = artId ? artistsMapById.get(artId) : "?"; const imgF = isAlbum?'Capa do Álbum':'Capa'; const imgUrl = (f[imgF]?.[0]?.url)||'https://i.imgur.com/AD3MbBi.png'; return { id: id, title: f['Nome do Álbum']||f['Nome do Single/EP']||'?', artist: artName, artistId: artId, metascore: f['Metascore']||0, imageUrl: imgUrl, releaseDate: f['Data de Lançamento']||'?', tracks: tracks, totalDurationSeconds: dur }; }); }; const formattedAlbums = formatReleases(albumsData.records, true); const formattedSingles = formatReleases(singlesData.records, false); const formattedPlayers = (playersData.records||[]).map(r => ({ id: r.id, name: r.fields.Nome, artists: r.fields.Artistas||[] })); console.log("Dados carregados."); return { allArtists: artistsList, albums: formattedAlbums, singles: formattedSingles, players: formattedPlayers, musicas: Array.from(musicasMap.values()) }; } catch (error) { console.error("Falha GERAL loadAllData:", error); return null; }
     }

    // ATUALIZADO: Carrega dados anteriores do localStorage
    const initializeData = (data) => {
        try {
            // Carrega charts anteriores do localStorage
            try {
                const prevMusic = localStorage.getItem(PREVIOUS_MUSIC_CHART_KEY);
                previousMusicChartData = prevMusic ? JSON.parse(prevMusic) : {};
                const prevAlbum = localStorage.getItem(PREVIOUS_ALBUM_CHART_KEY);
                previousAlbumChartData = prevAlbum ? JSON.parse(prevAlbum) : {};
                const prevRpg = localStorage.getItem(PREVIOUS_RPG_CHART_KEY);
                previousRpgChartData = prevRpg ? JSON.parse(prevRpg) : {};
                 console.log("Previous chart data loaded from localStorage.");
            } catch (e) {
                console.error("Error loading previous chart data from localStorage:", e);
                previousMusicChartData = {}; // Reseta em caso de erro
                previousAlbumChartData = {};
                previousRpgChartData = {};
            }


            const artistsMapById = new Map();
            db.artists = (data.allArtists || []).map(artist => {
                const artistEntry = { ...artist, img: artist.imageUrl || 'https://i.imgur.com/AD3MbBi.png', albums: [], singles: [] };
                artistsMapById.set(artist.id, artist.name);
                return artistEntry;
            });
            db.songs = (data.musicas || []).map(song => ({ ...song, streams: song.streams || 0, cover: 'https://i.imgur.com/AD3MbBi.png', artist: artistsMapById.get((song.artistIds || [])[0]) || '?' }));
            db.albums = []; db.singles = [];
            const allReleases = [...(data.albums || []), ...(data.singles || [])];
            const thirtyMinSec = 30 * 60;
            allReleases.forEach(item => {
                (item.tracks || []).forEach(tInfo => { const s = db.songs.find(sDb => sDb.id === tInfo.id); if (s) { s.cover = item.imageUrl; } else { console.warn(`Song ${tInfo.id} not found.`); } });
                const artistEntry = db.artists.find(a => a.id === item.artistId);
                if ((item.totalDurationSeconds || 0) >= thirtyMinSec) { db.albums.push(item); if (artistEntry) { artistEntry.albums.push(item); } }
                else { db.singles.push(item); if (artistEntry) { artistEntry.singles.push(item); } }
                if (!artistEntry && item.artist !== "?") { console.warn(`Artist ${item.artist} not found.`); }
            });
            db.players = data.players || [];
            console.log(`DB Init: A${db.artists.length}, B${db.albums.length}, S${db.singles.length}, M${db.songs.length}, P${db.players.length}`);
            return true;
        } catch (error) { console.error("CRITICAL initializeData:", error); alert("Erro GRAVE init data."); return false; }
    };

    // NOVO: Salva o ranking atual no localStorage
    const saveChartDataToLocalStorage = (chartType) => {
        let currentChartData;
        let storageKey;
        let dataList;

        console.log(`Saving previous chart data for: ${chartType}`);

        if (chartType === 'music') {
            storageKey = PREVIOUS_MUSIC_CHART_KEY;
            dataList = [...db.songs].sort((a, b) => (b.streams || 0) - (a.streams || 0)).slice(0, 50); // Recalcula o ranking atual
            currentChartData = dataList.reduce((acc, item, index) => {
                acc[item.id] = index + 1; // Salva { songId: rank }
                return acc;
            }, {});
             // Atualiza a variável global imediatamente
             previousMusicChartData = currentChartData;

        } else if (chartType === 'album') {
            storageKey = PREVIOUS_ALBUM_CHART_KEY;
            dataList = [...db.albums].sort((a, b) => (b.metascore || 0) - (a.metascore || 0)).slice(0, 50);
             currentChartData = dataList.reduce((acc, item, index) => {
                acc[item.id] = index + 1; // Salva { albumId: rank }
                return acc;
            }, {});
             previousAlbumChartData = currentChartData;
        } else if (chartType === 'rpg') { // Salva o chart RPG
             storageKey = PREVIOUS_RPG_CHART_KEY;
             dataList = computeChartData(db.artists); // Usa a função existente
             currentChartData = dataList.reduce((acc, item, index) => {
                acc[item.id] = index + 1; // Salva { artistId: rank }
                return acc;
            }, {});
             previousRpgChartData = currentChartData;
        } else {
            console.error("Tipo de chart inválido para salvar:", chartType);
            return;
        }

        try {
            localStorage.setItem(storageKey, JSON.stringify(currentChartData));
            console.log(`${chartType} chart saved to localStorage.`);
        } catch (e) {
            console.error(`Error saving ${chartType} chart data to localStorage:`, e);
        }
    };


    async function refreshAllData() { /* ... código inalterado ... */
        console.log("Atualizando dados..."); const data = await loadAllData(); if (data && data.allArtists) { if (initializeData(data)) { console.log("Dados atualizados."); renderRPGChart(); renderArtistsGrid('homeGrid', [...(db.artists||[])].sort(()=>0.5-Math.random()).slice(0,10)); renderChart('music'); renderChart('album'); if (currentPlayer) { populateArtistSelector(currentPlayer.id); } if (activeArtist && !document.getElementById('artistDetail').classList.contains('hidden')) { const refreshed = db.artists.find(a=>a.id===activeArtist.id); if(refreshed){ openArtistDetail(refreshed.name); } else { handleBack(); } } return true; } } console.error("Falha ao atualizar."); alert("Não foi possível atualizar."); return false;
     }

    // --- 2. NAVEGAÇÃO E UI --- (Sem mudanças)
    const switchView = (viewId, targetSectionId = null) => { /* ... código inalterado ... */ console.log(`Switching view: ${viewId}`); allViews.forEach(v => v.classList.add('hidden')); const target = document.getElementById(viewId); if (target) { target.classList.remove('hidden'); window.scrollTo(0,0); if (viewId==='mainView'&&targetSectionId) { switchTab(null, targetSectionId); } if (viewId!=='mainView'&&viewId!=='studioView') { if (viewHistory.length===0||viewHistory[viewHistory.length-1]!==viewId) { viewHistory.push(viewId); } } else if (viewId==='mainView') { viewHistory=[]; } } else { console.error(`View ${viewId} not found.`); } };
    const switchTab = (event, forceTabId = null) => { /* ... código inalterado ... */ let tabId; if (forceTabId) { tabId = forceTabId; } else if (event) { event.preventDefault(); tabId = event.currentTarget.dataset.tab; } else { return; } if (tabId === 'studioSection') { switchView('studioView'); document.querySelectorAll('.nav-tab, .bottom-nav-item').forEach(b => b.classList.remove('active')); document.querySelectorAll(`.nav-tab[data-tab="${tabId}"], .bottom-nav-item[data-tab="${tabId}"]`).forEach(b => b.classList.add('active')); return; } if (!document.getElementById('mainView').classList.contains('active')) { if (viewHistory.length>0||!document.getElementById('mainView').classList.contains('active')) { switchView('mainView'); } } document.querySelectorAll('#mainView .content-section').forEach(s => s.classList.remove('active')); document.querySelectorAll('.nav-tab, .bottom-nav-item').forEach(b => b.classList.remove('active')); const target = document.getElementById(tabId); if (target) { target.classList.add('active'); } document.querySelectorAll(`.nav-tab[data-tab="${tabId}"], .bottom-nav-item[data-tab="${tabId}"]`).forEach(b => b.classList.add('active')); };
    const handleBack = () => { /* ... código inalterado ... */ viewHistory.pop(); const prevId = viewHistory.pop() || 'mainView'; switchView(prevId); };
    const renderArtistsGrid = (containerId, artists) => { /* ... código inalterado ... */ const c = document.getElementById(containerId); if(!c){console.error(`Grid ${containerId} not found.`); return;} if(!artists||artists.length===0){c.innerHTML='<p class="empty-state">Nenhum artista.</p>'; return;} c.innerHTML = artists.map(a => `<div class="artist-card" data-artist-name="${a.name}"><img src="${a.img||a.imageUrl||'https://i.imgur.com/AD3MbBi.png'}" alt="${a.name}" class="artist-card-img"><p class="artist-card-name">${a.name}</p><span class="artist-card-type">Artista</span></div>`).join(''); };
    function formatArtistString(artistIds, collabType) { /* ... código inalterado ... */ if (!artistIds || artistIds.length === 0) return "?"; const names = artistIds.map(id => { const a = db.artists.find(art => art.id === id); return a ? a.name : "?"; }); const main = names[0]; if (names.length === 1) return main; const others = names.slice(1).join(', '); if (collabType === 'Dueto/Grupo') { return `${main} & ${others}`; } else { return main; } }
    function getCoverUrl(albumId) { /* ... código inalterado ... */ if (!albumId) return 'https://i.imgur.com/AD3MbBi.png'; const r = [...db.albums, ...db.singles].find(a => a.id === albumId); return (r ? r.imageUrl : 'https://i.imgur.com/AD3MbBi.png'); }

    // ATUALIZADO: renderChart para incluir indicador de movimento
    const renderChart = (type) => {
        let containerId, dataList, previousData;

        if (type === 'music') {
            containerId = 'musicChartsList';
            dataList = [...db.songs].sort((a, b) => (b.streams || 0) - (a.streams || 0)).slice(0, 50);
            previousData = previousMusicChartData; // Usa os dados carregados/salvos
        } else { // album
            containerId = 'albumChartsList';
            dataList = [...db.albums].sort((a, b) => (b.metascore || 0) - (a.metascore || 0)).slice(0, 50);
            previousData = previousAlbumChartData;
        }

        const container = document.getElementById(containerId);
        if (!container) { console.error(`Chart container ${containerId} not found.`); return; }

        if (!dataList || dataList.length === 0) {
            container.innerHTML = `<p class="empty-state">Nenhum item no chart.</p>`;
            return;
        }

        container.innerHTML = dataList.map((item, index) => {
            const currentRank = index + 1;
            const previousRank = previousData[item.id]; // Pega a posição anterior pelo ID
            let movement = 'stable';
            let iconClass = 'fa-minus';
            let trendClass = 'trend-stable';

            if (previousRank === undefined) {
                movement = 'new';
                trendClass = 'trend-new';
                // iconClass = 'fa-star'; // Poderia usar outra ícone para novo
            } else if (currentRank < previousRank) {
                movement = 'up';
                iconClass = 'fa-caret-up';
                trendClass = 'trend-up';
            } else if (currentRank > previousRank) {
                movement = 'down';
                iconClass = 'fa-caret-down';
                trendClass = 'trend-down';
            }
            // Se currentRank === previousRank, mantém 'stable' e 'fa-minus'

            // Gera o HTML do indicador
            const indicatorHtml = `<span class="chart-rank-indicator ${trendClass}"><i class="fas ${iconClass}"></i></span>`;

            if (type === 'music') {
                const artistName = formatArtistString(item.artistIds, item.collabType);
                return `
                    <div class="chart-item" data-song-id="${item.id}">
                        ${indicatorHtml} {/* Indicador */}
                        <span class="chart-rank">${currentRank}</span>
                        <img src="${item.cover || getCoverUrl(item.albumId)}" alt="${item.title}" class="chart-item-img">
                        <div class="chart-item-info">
                            <span class="chart-item-title">${item.title}</span>
                            <span class="chart-item-artist">${artistName}</span>
                        </div>
                        <span class="chart-item-duration">${(item.streams || 0).toLocaleString('pt-BR')}</span>
                    </div>
                `;
            } else { // album
                return `
                    <div class="chart-item" data-album-id="${item.id}">
                         ${indicatorHtml} {/* Indicador */}
                        <span class="chart-rank">${currentRank}</span>
                        <img src="${item.imageUrl}" alt="${item.title}" class="chart-item-img">
                        <div class="chart-item-info">
                            <span class="chart-item-title">${item.title}</span>
                            <span class="chart-item-artist">${item.artist}</span>
                        </div>
                        <span class="chart-item-score">${item.metascore}</span>
                    </div>
                `;
            }
        }).join('');
    };


    const openArtistDetail = (artistName) => { /* ... código inalterado ... */
        const artist = db.artists.find(a => a.name === artistName); if (!artist) { console.error(`Artista "${artistName}" não encontrado.`); handleBack(); return; } activeArtist = artist; document.getElementById('detailBg').style.backgroundImage = `url(${artist.img})`; document.getElementById('detailName').textContent = artist.name; const popularSongs = [...db.songs].filter(s => s.artistIds && s.artistIds.includes(artist.id)).sort((a, b) => (b.streams || 0) - (a.streams || 0)).slice(0, 5); const popularContainer = document.getElementById('popularSongsList'); if (popularSongs.length > 0) { popularContainer.innerHTML = popularSongs.map((song, index) => `<div class="song-row" data-song-id="${song.id}"><span>${index + 1}</span><div class="song-row-info"><img src="${song.cover || getCoverUrl(song.albumId)}" alt="${song.title}" class="song-row-cover"><span class="song-row-title">${song.title}</span></div><span class="song-streams">${(song.streams || 0).toLocaleString('pt-BR')}</span></div>`).join(''); } else { popularContainer.innerHTML = '<p class="empty-state-small">Nenhuma música popular.</p>'; } const albumsContainer = document.getElementById('albumsList'); const sortedAlbums = (artist.albums || []).sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)); albumsContainer.innerHTML = sortedAlbums.map(album => `<div class="scroll-item" data-album-id="${album.id}"><img src="${album.imageUrl}" alt="${album.title}"><p>${album.title}</p><span>${new Date(album.releaseDate).getFullYear()}</span></div>`).join('') || '<p class="empty-state-small">Nenhum álbum.</p>'; const singlesContainer = document.getElementById('singlesList'); const sortedSingles = (artist.singles || []).sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)); singlesContainer.innerHTML = sortedSingles.map(single => `<div class="scroll-item" data-album-id="${single.id}"><img src="${single.imageUrl}" alt="${single.title}"><p>${single.title}</p><span>${new Date(single.releaseDate).getFullYear()}</span></div>`).join('') || '<p class="empty-state-small">Nenhum single.</p>'; const recommended = [...db.artists].filter(a => a.id !== artist.id).sort(() => 0.5 - Math.random()).slice(0, 5); renderArtistsGrid('recommendedGrid', recommended); switchView('artistDetail');
     };
    const openAlbumDetail = (albumId) => { /* ... código inalterado ... */
        const album = [...db.albums, ...db.singles].find(a => a.id === albumId); if (!album) { console.error(`Álbum/Single ID "${albumId}" não encontrado.`); return; } document.getElementById('albumDetailBg').style.backgroundImage = `url(${album.imageUrl})`; document.getElementById('albumDetailCover').src = album.imageUrl; document.getElementById('albumDetailTitle').textContent = album.title; const releaseDate = new Date(album.releaseDate).getFullYear(); const artistObj = db.artists.find(a => a.id === album.artistId); document.getElementById('albumDetailInfo').innerHTML = `Por <strong class="artist-link" data-artist-name="${artistObj ? artistObj.name : ''}">${album.artist}</strong> • ${releaseDate}`; const tracklistContainer = document.getElementById('albumTracklist'); tracklistContainer.innerHTML = (album.tracks || []).map(song => { const artistName = formatArtistString(song.artistIds, song.collabType); return `<div class="track-row" data-song-id="${song.id}"><span class="track-number">${song.trackNumber}</span><div class="track-info"><span class="track-title">${song.title}</span><span class="track-artist-feat">${artistName}</span></div><span class="track-duration">${(song.streams || 0).toLocaleString('pt-BR')}</span></div>`; }).join(''); switchView('albumDetail');
     };
    const openDiscographyDetail = (type) => { /* ... código inalterado ... */
        if (!activeArtist) { console.error("Nenhum artista ativo."); handleBack(); return; } const data = (type==='albums')?(activeArtist.albums||[]).sort((a,b)=>new Date(b.releaseDate)-new Date(a.releaseDate)):(activeArtist.singles||[]).sort((a,b)=>new Date(b.releaseDate)-new Date(a.releaseDate)); const title = (type==='albums')?`Álbuns de ${activeArtist.name}`:`Singles & EPs de ${activeArtist.name}`; document.getElementById('discographyTypeTitle').textContent = title; const grid = document.getElementById('discographyGrid'); grid.innerHTML = data.map(item => `<div class="scroll-item" data-album-id="${item.id}"><img src="${item.imageUrl}" alt="${item.title}"><p>${item.title}</p><span>${new Date(item.releaseDate).getFullYear()}</span></div>`).join('') || '<p class="empty-state">Nenhum lançamento.</p>'; switchView('discographyDetail');
     };
    const handleSearch = () => { /* ... código inalterado ... */
        const query = searchInput.value.toLowerCase().trim(); if (!query) { switchTab(null, 'homeSection'); return; } const resultsContainer = document.getElementById('searchResults'); const noResultsEl = document.getElementById('noResults'); const filteredArtists = db.artists.filter(a => a.name.toLowerCase().includes(query)); const filteredAlbums = [...db.albums, ...db.singles].filter(a => a.title.toLowerCase().includes(query)); let html = ''; let count = 0; if (filteredArtists.length > 0) { html += '<h3 class="section-title">Artistas</h3>'; html += filteredArtists.map(a => { count++; return `<div class="artist-card" data-artist-name="${a.name}"><img src="${a.img}" alt="${a.name}" class="artist-card-img"><p class="artist-card-name">${a.name}</p><span class="artist-card-type">Artista</span></div>`; }).join(''); } if (filteredAlbums.length > 0) { html += '<h3 class="section-title">Álbuns & Singles</h3>'; html += filteredAlbums.map(al => { count++; return `<div class="artist-card" data-album-id="${al.id}"><img src="${al.imageUrl}" alt="${al.title}" class="artist-card-img"><p class="artist-card-name">${al.title}</p><span class="artist-card-type">${al.artist}</span></div>`; }).join(''); } resultsContainer.innerHTML = html; if (count > 0) { noResultsEl.classList.add('hidden'); resultsContainer.classList.remove('hidden'); } else { noResultsEl.classList.remove('hidden'); resultsContainer.classList.add('hidden'); } switchTab(null, 'searchSection');
     };

    // ATUALIZADO: setupCountdown para salvar o chart anterior ANTES de renderizar o novo
    const setupCountdown = (timerId, chartType) => { // Passa o tipo de chart
        const timerElement = document.getElementById(timerId);
        if (!timerElement) return;

        const calculateTargetDate = () => { /* ... (lógica inalterada) ... */
             const now = new Date(); const target = new Date(now); let daysToMonday = (1 + 7 - now.getDay()) % 7; if (daysToMonday === 0 && now.getHours() >= 0) { daysToMonday = 7; } target.setDate(now.getDate() + daysToMonday); target.setHours(0, 0, 0, 0); return target;
         };

        let targetDate = calculateTargetDate();

        const updateTimer = () => {
            const now = new Date().getTime();
            const distance = targetDate.getTime() - now;

            if (distance < 0) {
                console.log(`Timer ${timerId} finished. Saving current ${chartType} chart before rendering new one.`);
                // *** AQUI: Salva o chart ATUAL como o "anterior" para a PRÓXIMA semana ***
                saveChartDataToLocalStorage(chartType);

                targetDate = calculateTargetDate(); // Recalcula para a próxima semana

                // Renderiza o chart (agora ele usará os dados salvos)
                if (chartType === 'music') renderChart('music');
                else if (chartType === 'album') renderChart('album');
                else if (chartType === 'rpg') renderRPGChart(); // Renderiza o chart RPG se for o caso

                // Atualiza o display imediatamente após o reset (para não mostrar negativo)
                 updateTimerDisplay(targetDate.getTime() - new Date().getTime());
                return; // Sai da função para evitar o setInterval continuar com o tempo antigo
            }
             updateTimerDisplay(distance); // Função separada para atualizar o texto
        };

        // Função para atualizar apenas o texto do timer
         const updateTimerDisplay = (distance) => {
             const days = Math.floor(distance / (1000 * 60 * 60 * 24));
             const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
             const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
             const seconds = Math.floor((distance % (1000 * 60)) / 1000);
             const f = (n) => (n < 10 ? '0' + n : n);
             // Garante que não mostre números negativos brevemente
             timerElement.textContent = distance < 0 ? `00d 00h 00m 00s` : `${f(days)}d ${f(hours)}h ${f(minutes)}m ${f(seconds)}s`;
         }


        updateTimer(); // Chama uma vez para exibir o tempo inicial
        setInterval(updateTimer, 1000); // Continua atualizando a cada segundo
    };


    // --- 3. SISTEMA DE RPG ---
    const CHART_TOP_N = 20; const STREAMS_PER_POINT = 10000;
    const calculateSimulatedStreams = (points, lastActiveISO) => { /* ...código inalterado... */ if (!lastActiveISO) return 0; const now = new Date(); const last = new Date(lastActiveISO); const diffH = Math.abs(now - last) / 36e5; const streamDay = (points||0)*STREAMS_PER_POINT; const streamH = streamDay/24; return Math.floor(streamH*diffH); };
    const computeChartData = (artistsArray) => { /* ...código inalterado... */ return artistsArray.map(a => ({ id: a.id, name: a.name, img: a.img, streams: calculateSimulatedStreams(a.RPGPoints, a.LastActive), points: a.RPGPoints||0 })).sort((a,b) => b.streams - a.streams).slice(0, CHART_TOP_N); };

    // ATUALIZADO: renderRPGChart para incluir indicadores
    function renderRPGChart() {
        const chartData = computeChartData(db.artists); // Calcula o ranking atual
        const container = document.getElementById('artistsGrid'); // Usa o mesmo container
        const previousData = previousRpgChartData; // Pega os dados anteriores

        if (!container) { console.error("Container 'artistsGrid' não encontrado."); return; }
        if (chartData.length === 0) { container.innerHTML = '<p class="empty-state">Nenhum artista no chart RPG.</p>'; return; }

        container.innerHTML = chartData.map((artist, index) => {
            const currentRank = index + 1;
            const previousRank = previousData[artist.id];
            let iconClass = 'fa-minus';
            let trendClass = 'trend-stable';

            if (previousRank === undefined) { trendClass = 'trend-new'; }
            else if (currentRank < previousRank) { iconClass = 'fa-caret-up'; trendClass = 'trend-up'; }
            else if (currentRank > previousRank) { iconClass = 'fa-caret-down'; trendClass = 'trend-down'; }

            // Adapta o HTML do artist-card para incluir o indicador
            // (Pode precisar ajustar CSS para posicionar corretamente)
            return `
                <div class="artist-card" data-artist-name="${artist.name}">
                    <span class="rpg-rank">#${currentRank}</span>
                     {/* Indicador para RPG Chart */}
                    <span class="chart-rank-indicator rpg-indicator ${trendClass}"><i class="fas ${iconClass}"></i></span>
                    <img src="${artist.img}" alt="${artist.name}" class="artist-card-img">
                    <p class="artist-card-name">${artist.name}</p>
                    <span class="artist-card-type">${(artist.streams || 0).toLocaleString('pt-BR')} streams</span>
                </div>
            `;
        }).join('');
    }


    // --- 4. SISTEMA DO ESTÚDIO --- (Sem mudanças nas funções de login, populate selects, modais, etc.)
    function populateArtistSelector(playerId) { /* ... código inalterado ... */ const p=db.players.find(pl=>pl.id===playerId); if(!p)return; const ids=p.artists||[]; const opts=ids.map(id=>{const a=db.artists.find(ar=>ar.id===id); return a?`<option value="${a.id}">${a.name}</option>`:'';}).join(''); singleArtistSelect.innerHTML=`<option value="">Selecione...</option>${opts}`; albumArtistSelect.innerHTML=`<option value="">Selecione...</option>${opts}`; }
    function loginPlayer(playerId) { /* ... código inalterado ... */ if(!playerId){alert("Selecione.");return;} currentPlayer=db.players.find(p=>p.id===playerId); if(currentPlayer){document.getElementById('playerName').textContent=currentPlayer.name; loginPrompt.classList.add('hidden'); loggedInInfo.classList.remove('hidden'); studioLaunchWrapper.classList.remove('hidden'); populateArtistSelector(currentPlayer.id);} }
    function logoutPlayer() { /* ... código inalterado ... */ currentPlayer=null; document.getElementById('playerName').textContent=''; loginPrompt.classList.remove('hidden'); loggedInInfo.classList.add('hidden'); studioLaunchWrapper.classList.add('hidden'); }
    function populateArtistSelectForFeat(targetSelectElement) { /* ... código inalterado ... */ let currentMainId=null; let selectEl=targetSelectElement; if(document.getElementById('newSingleForm').classList.contains('active')){currentMainId=singleArtistSelect.value; selectEl=featArtistSelect;} else if(document.getElementById('newAlbumForm').classList.contains('active')){currentMainId=albumArtistSelect.value; selectEl=inlineFeatArtistSelect;} else {selectEl=featArtistSelect;} if(!selectEl){console.error("Select feats não encontrado!"); return;} selectEl.innerHTML = db.artists.filter(a=>a.id!==currentMainId).sort((a,b)=>a.name.localeCompare(b.name)).map(a=>`<option value="${a.id}">${a.name}</option>`).join(''); if(selectEl.innerHTML===''){selectEl.innerHTML='<option value="">Nenhum outro</option>';} }
    function openFeatModal(buttonElement) { /* ... código inalterado ... */ const targetId=buttonElement.dataset.target; currentFeatTarget=document.getElementById(targetId); if(!currentFeatTarget){console.error("Alvo feat não encontrado:", targetId); return;} populateArtistSelectForFeat(featArtistSelect); featModal.classList.remove('hidden'); }
    function closeFeatModal() { /* ... código inalterado ... */ featModal.classList.add('hidden'); currentFeatTarget=null; }
    function confirmFeat() { /* ... código inalterado ... */ const artistId=featArtistSelect.value; const artistName=featArtistSelect.options[featArtistSelect.selectedIndex].text; const featType=featTypeSelect.value; if(!artistId||!currentFeatTarget){console.error("Confirm feat sem ID ou alvo."); return;} const tag=document.createElement('span'); tag.className='feat-tag'; tag.textContent=`${featType} ${artistName}`; tag.dataset.artistId=artistId; tag.dataset.featType=featType; tag.dataset.artistName=artistName; tag.addEventListener('click',()=>tag.remove()); currentFeatTarget.appendChild(tag); closeFeatModal(); }
    function toggleInlineFeatAdder() { /* ... código inalterado ... */ if(!inlineFeatAdder)return; const hidden=inlineFeatAdder.classList.contains('hidden'); if(hidden){populateArtistSelectForFeat(inlineFeatArtistSelect); inlineFeatAdder.classList.remove('hidden'); if(addInlineFeatBtn)addInlineFeatBtn.innerHTML='<i class="fas fa-times"></i> Cancelar Feat';} else {inlineFeatAdder.classList.add('hidden'); if(addInlineFeatBtn)addInlineFeatBtn.innerHTML='<i class="fas fa-plus"></i> Adicionar Feat';} }
    function confirmInlineFeat() { /* ... código inalterado ... */ const artistId=inlineFeatArtistSelect.value; const artistName=inlineFeatArtistSelect.options[inlineFeatArtistSelect.selectedIndex].text; const featType=inlineFeatTypeSelect.value; if(!artistId||!albumTrackFeatList){console.error("Confirm inline feat sem ID ou alvo."); return;} const tag=document.createElement('span'); tag.className='feat-tag'; tag.textContent=`${featType} ${artistName}`; tag.dataset.artistId=artistId; tag.dataset.featType=featType; tag.dataset.artistName=artistName; tag.addEventListener('click',()=>tag.remove()); albumTrackFeatList.appendChild(tag); inlineFeatAdder.classList.add('hidden'); if(addInlineFeatBtn)addInlineFeatBtn.innerHTML='<i class="fas fa-plus"></i> Adicionar Feat'; }
    function cancelInlineFeat() { /* ... código inalterado ... */ inlineFeatAdder.classList.add('hidden'); if(addInlineFeatBtn)addInlineFeatBtn.innerHTML='<i class="fas fa-plus"></i> Adicionar Feat'; }
    function openAlbumTrackModal(itemToEdit = null) { /* ... código inalterado ... */ albumTrackNameInput.value=''; albumTrackDurationInput.value=''; albumTrackTypeSelect.value='Album Track'; albumTrackFeatList.innerHTML=''; editingTrackItemId.value=''; editingTrackItem=null; inlineFeatAdder.classList.add('hidden'); if(addInlineFeatBtn)addInlineFeatBtn.innerHTML='<i class="fas fa-plus"></i> Adicionar Feat'; if(itemToEdit){albumTrackModalTitle.textContent='Editar Faixa'; editingTrackItemId.value=itemToEdit.id||itemToEdit.dataset.itemId; editingTrackItem=itemToEdit; albumTrackNameInput.value=itemToEdit.dataset.trackName||''; albumTrackDurationInput.value=itemToEdit.dataset.durationStr||''; albumTrackTypeSelect.value=itemToEdit.dataset.trackType||'Album Track'; const feats=JSON.parse(itemToEdit.dataset.feats||'[]'); feats.forEach(f=>{const tag=document.createElement('span'); tag.className='feat-tag'; tag.textContent=`${f.type} ${f.name}`; tag.dataset.artistId=f.id; tag.dataset.featType=f.type; tag.dataset.artistName=f.name; tag.addEventListener('click',()=>tag.remove()); albumTrackFeatList.appendChild(tag);}); } else {albumTrackModalTitle.textContent='Adicionar Faixa'; editingTrackItemId.value=`temp_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;} albumTrackModal.classList.remove('hidden'); }
    function closeAlbumTrackModal() { /* ... código inalterado ... */ albumTrackModal.classList.add('hidden'); editingTrackItem=null; editingTrackItemId.value=''; inlineFeatAdder.classList.add('hidden'); if(addInlineFeatBtn)addInlineFeatBtn.innerHTML='<i class="fas fa-plus"></i> Adicionar Feat'; }
    function saveAlbumTrack() { /* ... código inalterado ... */ const name=albumTrackNameInput.value.trim(); const durStr=albumTrackDurationInput.value.trim(); const type=albumTrackTypeSelect.value; const durSec=parseDurationToSeconds(durStr); const itemId=editingTrackItemId.value; if(!name||!durStr||durSec===0){alert("Nome e Duração (MM:SS) válidos.");return;} const featTags=albumTrackFeatList.querySelectorAll('.feat-tag'); const featsData=Array.from(featTags).map(t=>({id:t.dataset.artistId, type:t.dataset.featType, name:t.dataset.artistName})); let target=editingTrackItem||albumTracklistEditor.querySelector(`[data-item-id="${itemId}"]`); if(target){target.dataset.trackName=name; target.dataset.durationStr=durStr; target.dataset.trackType=type; target.dataset.feats=JSON.stringify(featsData); target.querySelector('.track-title-display').textContent=name; target.querySelector('.track-details-display .duration').textContent=`Duração: ${durStr}`; target.querySelector('.track-details-display .type').textContent=`Tipo: ${type}`; const featDisp=target.querySelector('.feat-list-display'); if(featDisp){featDisp.innerHTML=featsData.map(f=>`<span class="feat-tag-display">${f.type} ${f.name}</span>`).join('');}} else {const newItem=document.createElement('div'); newItem.className='track-list-item-display'; newItem.dataset.itemId=itemId; newItem.dataset.trackName=name; newItem.dataset.durationStr=durStr; newItem.dataset.trackType=type; newItem.dataset.feats=JSON.stringify(featsData); newItem.innerHTML=`<span class="track-number-display"></span><i class="fas fa-bars drag-handle"></i><div class="track-info-display"><span class="track-title-display">${name}</span><div class="track-details-display"><span class="duration">Duração: ${durStr}</span><span class="type">Tipo: ${type}</span></div><div class="feat-list feat-list-display" style="margin-top:5px;">${featsData.map(f=>`<span class="feat-tag-display">${f.type} ${f.name}</span>`).join('')}</div></div><div class="track-actions"><button type="button" class="small-btn edit-track-btn"><i class="fas fa-pencil-alt"></i></button><button type="button" class="small-btn remove-track-btn"><i class="fas fa-times"></i></button></div>`; const empty=albumTracklistEditor.querySelector('.empty-state-small'); if(empty)empty.remove(); albumTracklistEditor.appendChild(newItem);} updateTrackNumbers(); closeAlbumTrackModal(); }
    function updateTrackNumbers() { /* ... código inalterado ... */ const tracks=albumTracklistEditor.querySelectorAll('.track-list-item-display'); if(tracks.length===0&&!albumTracklistEditor.querySelector('.empty-state-small')){if(!albumTracklistEditor.querySelector('.empty-state-small')){albumTracklistEditor.innerHTML='<p class="empty-state-small">Nenhuma faixa.</p>';}} else if(tracks.length>0){const empty=albumTracklistEditor.querySelector('.empty-state-small'); if(empty){empty.remove();}} tracks.forEach((t, i)=>{let num=t.querySelector('.track-number-display'); if(!num){num=document.createElement('span'); num.className='track-number-display'; t.insertBefore(num, t.querySelector('.drag-handle'));} num.textContent=`${i+1}.`; num.style.fontWeight='700'; num.style.color='var(--text-secondary)'; num.style.width='25px'; num.style.textAlign='right'; num.style.marginRight='5px';}); }
    async function createAirtableRecord(tableName, fields) { /* ... código inalterado ... */ const url=`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`; try{const r=await fetch(url,{method:'POST',headers:{'Authorization':`Bearer ${AIRTABLE_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({fields:fields})}); if(!r.ok){const e=await r.json(); console.error(`Erro Airtable ${tableName}:`,JSON.stringify(e,null,2)); throw new Error(`Airtable error: ${r.status}`);} return await r.json();} catch(e){console.error(`Falha req ${tableName}:`,e); return null;} }
    function parseDurationToSeconds(durationStr) { /* ... código inalterado ... */ if(!durationStr)return 0; const p=durationStr.split(':'); if(p.length!==2)return 0; const m=parseInt(p[0],10); const s=parseInt(p[1],10); if(isNaN(m)||isNaN(s)||s<0||s>59||m<0){return 0;} return (m*60)+s; }
    async function handleSingleSubmit(event) { /* ... código inalterado ... */ event.preventDefault(); const btn=document.getElementById('submitNewSingle'); const artistId=singleArtistSelect.value; const title=document.getElementById('singleTitle').value; const cover=document.getElementById('singleCoverUrl').value; const date=singleReleaseDateInput.value; const track=document.getElementById('trackName').value; const dur=document.getElementById('trackDuration').value; if(!artistId||!title||!cover||!date||!track||!dur||parseDurationToSeconds(dur)===0){alert("Preencha tudo (duração MM:SS).");return;} btn.disabled=true; btn.textContent='Aguardando...'; trackTypeModal.classList.remove('hidden'); }
    async function processSingleSubmission(trackType) { /* ... código inalterado ... */ const btn=document.getElementById('submitNewSingle'); trackTypeModal.classList.add('hidden'); btn.textContent='Enviando...'; try{const artistId=singleArtistSelect.value; const title=document.getElementById('singleTitle').value; const cover=document.getElementById('singleCoverUrl').value; const date=singleReleaseDateInput.value; const track=document.getElementById('trackName').value; const durStr=document.getElementById('trackDuration').value; const durSec=parseDurationToSeconds(durStr); const singleRes=await createAirtableRecord('Singles e EPs',{"Nome do Single/EP":title, "Artista":[artistId], "Capa":[{"url":cover}], "Data de Lançamento":date}); if(!singleRes||!singleRes.id){throw new Error("Falha criar Single/EP.");} const singleId=singleRes.id; const featTags=document.querySelectorAll('#singleFeatList .feat-tag'); let fTrack=track; let fArtists=[artistId]; let collab=null; if(featTags.length>0){const fIds=[]; const fNames=[]; collab=featTags[0].dataset.featType; featTags.forEach(t=>{fIds.push(t.dataset.artistId); fNames.push(t.dataset.artistName);}); if(collab==="Feat."){fTrack=`${track} (feat. ${fNames.join(', ')})`; fArtists=[artistId];} else if(collab==="Dueto/Grupo"){fTrack=track; fArtists=[artistId,...fIds];}} const musicFields={"Nome da Faixa":fTrack, "Artista":fArtists, "Duração":durSec, "Nº da Faixa":1, "Singles e EPs":[singleId], "Tipo de Faixa":trackType}; if(collab){musicFields["Tipo de Colaboração"]=collab;} console.log('DEBUG Single Musica:', musicFields); const musicRes=await createAirtableRecord('Músicas', musicFields); if(!musicRes||!musicRes.id){console.error("Single criado, música falhou."); throw new Error("Falha criar música.");} alert("Single lançado!"); newSingleForm.reset(); singleReleaseDateInput.value=new Date().toISOString().split('T')[0]; document.getElementById('singleFeatList').innerHTML=''; await refreshAllData();} catch(e){alert("Erro lançar single."); console.error("Erro processSingle:", e);} finally{btn.disabled=false; btn.textContent='Lançar Single';} }
    function initAlbumForm() { /* ... código inalterado ... */ albumTracklistEditor.innerHTML=''; updateTrackNumbers(); if(albumTracklistEditor&&typeof Sortable!=='undefined'){if(albumTracklistSortable){albumTracklistSortable.destroy();} albumTracklistSortable=Sortable.create(albumTracklistEditor,{animation:150, handle:'.drag-handle', onEnd:updateTrackNumbers});} else if(typeof Sortable==='undefined'){console.warn("SortableJS não carregado.");} }
    // openAlbumTrackModal, closeAlbumTrackModal, saveAlbumTrack, updateTrackNumbers (já atualizadas acima)
    async function batchCreateAirtableRecords(tableName, records) { /* ... código inalterado ... */ const url=`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`; const chunks=[]; for(let i=0; i<records.length; i+=10){chunks.push(records.slice(i, i+10));} const results=[]; for(const chunk of chunks){console.log(`Enviando lote ${tableName}:`, chunk); try{const res=await fetch(url,{method:'POST',headers:{'Authorization':`Bearer ${AIRTABLE_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({"records":chunk.map(fields=>({fields}))})}); if(!res.ok){const e=await res.json(); console.error(`Erro lote ${tableName}:`,JSON.stringify(e,null,2)); throw new Error(`Airtable batch error: ${res.status}`);} const data=await res.json(); results.push(...data.records);} catch(e){console.error(`Falha req batch ${tableName}:`,e); return null;}} return results; }
    async function handleAlbumSubmit(event) { /* ... código inalterado ... */ event.preventDefault(); const btn=document.getElementById('submitNewAlbum'); btn.disabled=true; btn.textContent='Enviando...'; try{const artistId=albumArtistSelect.value; const title=document.getElementById('albumTitle').value; const cover=document.getElementById('albumCoverUrl').value; const date=albumReleaseDateInput.value; if(!artistId||!title||!cover||!date){alert("Preencha Álbum/EP."); throw new Error("Campos Álbum faltando.");} const items=albumTracklistEditor.querySelectorAll('.track-list-item-display'); if(items.length===0){alert("Pelo menos uma faixa."); throw new Error("Nenhuma faixa.");} let totalDur=0; const musicRecs=[]; for(let i=0; i<items.length; i++){const item=items[i]; const name=item.dataset.trackName; const durStr=item.dataset.durationStr; const type=item.dataset.trackType; const feats=JSON.parse(item.dataset.feats||'[]'); const durSec=parseDurationToSeconds(durStr); if(!name||!durStr||durSec===0){alert(`Dados inválidos Faixa ${i+1}.`); throw new Error(`Dados inválidos ${i+1}.`);} totalDur+=durSec; let fName=name; let fArts=[artistId]; let collab=null; if(feats.length>0){collab=feats[0].type; const fIds=feats.map(f=>f.id); const fNames=feats.map(f=>f.name); if(collab==="Feat."){fName=`${name} (feat. ${fNames.join(', ')})`; fArts=[artistId];} else if(collab==="Dueto/Grupo"){fName=name; fArts=[artistId,...fIds];}} const rec={"Nome da Faixa":fName, "Artista":fArts, "Duração":durSec, "Nº da Faixa":i+1, "Tipo de Faixa":type}; if(collab){rec["Tipo de Colaboração"]=collab;} musicRecs.push(rec);} const isAlbum=totalDur>=(30*60); const tName=isAlbum?'Álbuns':'Singles e EPs'; const nFld=isAlbum?'Nome do Álbum':'Nome do Single/EP'; const cFld=isAlbum?'Capa do Álbum':'Capa'; const relRes=await createAirtableRecord(tName,{[nFld]:title, "Artista":[artistId], [cFld]:[{"url":cover}], "Data de Lançamento":date}); if(!relRes||!relRes.id){throw new Error("Falha criar Álbum/EP.");} const relId=relRes.id; const albLink='Álbuns'; const sngLink='Singles e EPs'; const linkFld=isAlbum?albLink:sngLink; musicRecs.forEach(rec=>{rec[linkFld]=[relId];}); const created=await batchCreateAirtableRecords('Músicas',musicRecs); if(!created||created.length!==musicRecs.length){console.error("Álbum/EP criado, músicas falharam."); throw new Error("Falha criar faixas.");} alert("Álbum/EP lançado!"); newAlbumForm.reset(); albumReleaseDateInput.value=new Date().toISOString().split('T')[0]; initAlbumForm(); await refreshAllData();} catch(e){alert("Erro lançar álbum/EP."); console.error("Erro handleAlbumSubmit:", e);} finally{btn.disabled=false; btn.textContent='Lançar Álbum / EP';} }

    // --- 5. INICIALIZAÇÃO GERAL ---

    function initializeBodyClickListener() { /* ... código inalterado ... */ document.body.addEventListener('click', (e) => { const artistCard = e.target.closest('.artist-card[data-artist-name]'); const albumCard = e.target.closest('[data-album-id]'); const songCard = e.target.closest('.song-row[data-song-id], .track-row[data-song-id], .chart-item[data-song-id]'); const artistLink = e.target.closest('.artist-link[data-artist-name]'); const discogLink = e.target.closest('.see-all-btn[data-type]'); if (discogLink) { openDiscographyDetail(discogLink.dataset.type); return; } if (albumCard) { openAlbumDetail(albumCard.dataset.albumId); return; } if (artistCard) { openArtistDetail(artistCard.dataset.artistName); return; } if (artistLink) { openArtistDetail(artistLink.dataset.artistName); return; } if (songCard) { console.log("Clicou música ID:", songCard.dataset.songId); } }); searchInput.addEventListener('input', handleSearch); searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { handleSearch(); } }); }

    async function main() {
        console.log("Iniciando Aplicação...");
        if (!initializeDOMElements()) return;

        document.body.classList.add('loading');
        const data = await loadAllData();

        if (data && data.allArtists) {
            if (!initializeData(data)) return;

            try {
                initializeStudio();

                if (newSingleForm) newSingleForm.addEventListener('submit', handleSingleSubmit);
                if (newAlbumForm) newAlbumForm.addEventListener('submit', handleAlbumSubmit);

                // Listeners Modal Tipo Faixa (Single)
                if (confirmTrackTypeBtn) { confirmTrackTypeBtn.addEventListener('click', () => { processSingleSubmission(trackTypeSelect.value); }); }
                if (cancelTrackTypeBtn) { cancelTrackTypeBtn.addEventListener('click', () => { trackTypeModal.classList.add('hidden'); const btn = document.getElementById('submitNewSingle'); btn.disabled = false; btn.textContent = 'Lançar Single'; }); }

                renderRPGChart(); // Renderiza o chart RPG com indicadores
                const allNavs = [...document.querySelectorAll('.nav-tab'), ...document.querySelectorAll('.bottom-nav-item')];
                allNavs.forEach(nav => { nav.removeEventListener('click', switchTab); nav.addEventListener('click', switchTab); });
                renderArtistsGrid('homeGrid', [...(db.artists || [])].sort(() => 0.5 - Math.random()).slice(0, 10));
                renderChart('music'); renderChart('album'); // Renderiza charts com indicadores

                // Passa o TIPO de chart para o countdown saber qual salvar
                setupCountdown('musicCountdownTimer', 'music');
                setupCountdown('albumCountdownTimer', 'album');
                // Adiciona countdown/save para o chart RPG (assumindo que atualiza na mesma frequência)
                // Se não quiser countdown visual, pode só salvar no início de renderRPGChart
                // setupCountdown('rpgCountdownTimer', 'rpg'); // Descomente se tiver um timer visual para RPG


                initializeBodyClickListener();
                document.querySelectorAll('.back-btn').forEach(btn => btn.addEventListener('click', handleBack));
                switchTab(null, 'homeSection');
                console.log("Aplicação Iniciada.");

            } catch (uiError) { console.error("Erro UI init:", uiError); document.body.innerHTML = '<div style="color: white; padding: 20px;"><h1>Erro Interface</h1><p>Ver console.</p></div>'; }
        } else { document.body.innerHTML = '<div style="color: white; padding: 20px;"><h1>Erro Crítico</h1><p>Dados Airtable não carregados.</p></div>'; console.error("Initialization failed: Data load error."); }
        document.body.classList.remove('loading');
    }

    main();

}); // Fim DOMContentLoaded
