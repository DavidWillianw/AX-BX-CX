document.addEventListener('DOMContentLoaded', async () => {

    // --- VARIÁVEIS GLOBAIS ---
    let db = { artists: [], players: [], releases: [], tracks: [] };
    let currentPlayer = null;

    // IDs da base
    const AIRTABLE_BASE_ID = 'appG5NOoblUmtSMVI';
    const AIRTABLE_API_KEY = 'pat5T28kjmJ4t6TQG.69bf34509e687fff6a3f76bd52e64518d6c92be8b1ee0a53bcc9f50fedcb5c70';

    // Elementos da UI
    const loginPrompt = document.getElementById('loginPrompt');
    const loggedInInfo = document.getElementById('loggedInInfo');
    const playerSelect = document.getElementById('playerSelect');
    const loginButton = document.getElementById('loginButton');
    const logoutButton = document.getElementById('logoutButton');
    const actionsWrapper = document.getElementById('actionsWrapper');
    const artistActionsList = document.getElementById('artistActionsList');
    const actionModal = document.getElementById('actionModal');
    const modalArtistName = document.getElementById('modalArtistName');
    const modalArtistId = document.getElementById('modalArtistId');
    const releaseSelect = document.getElementById('releaseSelect');
    const trackSelectWrapper = document.getElementById('trackSelectWrapper');
    const trackSelect = document.getElementById('trackSelect');
    const actionTypeSelect = document.getElementById('actionTypeSelect');
    const confirmActionButton = document.getElementById('confirmActionButton');
    const cancelActionButton = document.getElementById('cancelActionButton');
    const actionLimitInfo = document.getElementById('actionLimitInfo');
    const currentActionCount = document.getElementById('currentActionCount');
    const maxActionCount = document.getElementById('maxActionCount');

    // Chave localStorage
    const PLAYER_ID_KEY = 'spotifyRpgActions_playerId';

    // Configuração das Ações
    const ACTION_CONFIG = {
        'promo_tv': { limit: 10, countField: 'Promo_TV_Count', localCountKey: 'promo_tv_count', minStreams: 50000, maxStreams: 100000, isPromotion: true },
        'promo_radio': { limit: 10, countField: 'Promo_Radio_Count', localCountKey: 'promo_radio_count', minStreams: 30000, maxStreams: 70000, isPromotion: true },
        'promo_commercial': { limit: 5, countField: 'Promo_Commercial_Count', localCountKey: 'promo_commercial_count', minStreams: 10000, maxStreams: 150000, isPromotion: true },
        'promo_internet': { limit: 15, countField: 'Promo_Internet_Count', localCountKey: 'promo_internet_count', minStreams: 10000, maxStreams: 40000, isPromotion: true },
        'remix': { limit: 5, countField: 'Remix_Count', localCountKey: 'remix_count', minStreams: 25000, maxStreams: 50000, isPromotion: false },
        'mv': { limit: 3, countField: 'MV_Count', localCountKey: 'mv_count', minStreams: 70000, maxStreams: 120000, isPromotion: false }
    };


    // --- 1. CARREGAMENTO DE DADOS --- (Sem mudanças)

    async function fetchAllAirtablePages(baseUrl, fetchOptions) { /* ...código inalterado... */
        let allRecords = []; let offset = null;
        do { const sep = baseUrl.includes('?')?'&':'?'; const url = offset?`${baseUrl}${sep}offset=${offset}`:baseUrl; const res = await fetch(url, fetchOptions); if (!res.ok) { const txt = await res.text(); console.error(`Falha ${url}: ${res.status}-${txt}`); throw new Error(`Fetch fail ${baseUrl}`); } const data = await res.json(); if (data.records) { allRecords.push(...data.records); } offset = data.offset; } while (offset); return { records: allRecords };
     }
    async function loadRequiredData() { /* ...código inalterado... */
        const artistsURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Artists`; const playersURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Jogadores`; const albumsURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Álbuns')}`; const singlesURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Singles e EPs')}`; const tracksURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Músicas')}`; const fetchOptions = { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } }; console.log("Carregando dados..."); try { const [artistsData, playersData, albumsData, singlesData, tracksData] = await Promise.all([ fetchAllAirtablePages(artistsURL, fetchOptions), fetchAllAirtablePages(playersURL, fetchOptions), fetchAllAirtablePages(albumsURL, fetchOptions), fetchAllAirtablePages(singlesURL, fetchOptions), fetchAllAirtablePages(tracksURL, fetchOptions) ]); db.artists = artistsData.records.map(r => ({ id: r.id, name: r.fields['Name']||'?', RPGPoints:r.fields.RPGPoints||0, LastActive:r.fields.LastActive||null, promo_tv_count:r.fields.Promo_TV_Count||0, promo_radio_count:r.fields.Promo_Radio_Count||0, promo_commercial_count:r.fields.Promo_Commercial_Count||0, promo_internet_count:r.fields.Promo_Internet_Count||0, remix_count:r.fields.Remix_Count||0, mv_count:r.fields.MV_Count||0 })); db.players = playersData.records.map(r => ({ id: r.id, name: r.fields['Nome'], artists: r.fields['Artistas']||[] })); const allReleases = []; albumsData.records.forEach(r => allReleases.push({ id: r.id, name: r.fields['Nome do Álbum']||'Álbum?', artists: r.fields['Artista']||[] })); singlesData.records.forEach(r => allReleases.push({ id: r.id, name: r.fields['Nome do Single/EP']||'Single?', artists: r.fields['Artista']||[] })); db.releases = allReleases; db.tracks = tracksData.records.map(r => { const releaseId = (r.fields['Álbuns']?r.fields['Álbuns'][0]:null)||(r.fields['Singles e EPs']?r.fields['Singles e EPs'][0]:null); return { id: r.id, name: r.fields['Nome da Faixa']||'Faixa?', release: releaseId, streams: r.fields.Streams||0, trackType: r.fields['Tipo de Faixa']||null }; }); console.log(`Dados carregados: ${db.artists.length}a, ${db.players.length}p, ${db.releases.length}r, ${db.tracks.length}t.`); } catch (error) { console.error("Erro loadData:", error); artistActionsList.innerHTML = "<p>Erro loadData.</p>"; }
     }

    // --- 2. LÓGICA DE LOGIN --- (Sem mudanças)
    function loginPlayer(playerId) { /* ...código inalterado... */
        currentPlayer = db.players.find(p => p.id === playerId); if (!currentPlayer) { console.error(`Jogador ${playerId} não encontrado.`); logoutPlayer(); return; } localStorage.setItem(PLAYER_ID_KEY, playerId); document.getElementById('playerName').textContent = currentPlayer.name; loginPrompt.classList.add('hidden'); loggedInInfo.classList.remove('hidden'); actionsWrapper.classList.remove('hidden'); displayArtistActions();
     }
    function logoutPlayer() { /* ...código inalterado... */
        currentPlayer = null; localStorage.removeItem(PLAYER_ID_KEY); loginPrompt.classList.remove('hidden'); loggedInInfo.classList.add('hidden'); actionsWrapper.classList.add('hidden'); artistActionsList.innerHTML = "<p>Faça login.</p>";
     }
    function initializeLogin() { /* ...código inalterado... */
        playerSelect.innerHTML = '<option value="" disabled selected>Selecione...</option>'; db.players.sort((a, b) => a.name.localeCompare(b.name)).forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; playerSelect.appendChild(o); }); loginButton.addEventListener('click', () => { if (playerSelect.value) loginPlayer(playerSelect.value); }); logoutButton.addEventListener('click', logoutPlayer); const storedId = localStorage.getItem(PLAYER_ID_KEY); if (storedId) { loginPlayer(storedId); } else { artistActionsList.innerHTML = "<p>Faça login.</p>"; }
     }

    // --- 3. LÓGICA DE AÇÕES RPG ---

    function getRandomInt(min, max) { /* ...código inalterado... */
        min = Math.ceil(min); max = Math.floor(max); return Math.floor(Math.random() * (max - min + 1)) + min;
     }
    function displayArtistActions() { /* ...código inalterado... */
        if (!currentPlayer) return; const playerArtists = currentPlayer.artists.map(id => db.artists.find(a => a.id === id)).filter(Boolean).sort((a,b) => a.name.localeCompare(b.name)); if (playerArtists.length === 0) { artistActionsList.innerHTML = "<p>Nenhum artista.</p>"; return; } artistActionsList.innerHTML = playerArtists.map(artist => `<div class="artist-action-item" data-artist-id="${artist.id}"><span>${artist.name}</span><div class="artist-action-buttons"><button class="small-btn btn-open-modal">Selecionar Ação</button></div></div>`).join(''); document.querySelectorAll('.btn-open-modal').forEach(b => { b.addEventListener('click', handleOpenModalClick); });
     }

    // --- 4. LÓGICA DO MODAL ---

    function handleOpenModalClick(event) { /* ...código inalterado... */
        const artistId = event.currentTarget.closest('.artist-action-item').dataset.artistId; const artist = db.artists.find(a => a.id === artistId); if (!artist) return; modalArtistName.textContent = artist.name; modalArtistId.value = artist.id; populateReleaseSelect(artist.id); actionTypeSelect.value = ""; trackSelectWrapper.classList.add('hidden'); actionLimitInfo.classList.add('hidden'); confirmActionButton.disabled = false; confirmActionButton.textContent = 'Confirmar Ação'; actionModal.classList.remove('hidden');
     }
    function populateReleaseSelect(artistId) { /* ...código inalterado... */
        const artistReleases = db.releases.filter(r => r.artists.includes(artistId)); releaseSelect.innerHTML = '<option value="" disabled selected>Selecione...</option>'; if (artistReleases.length === 0) { releaseSelect.innerHTML = '<option value="" disabled>Nenhum lançamento</option>'; return; } artistReleases.sort((a,b) => a.name.localeCompare(b.name)).forEach(r => { const o = document.createElement('option'); o.value = r.id; o.textContent = r.name; releaseSelect.appendChild(o); });
     }
    function populateTrackSelect(releaseId) { /* ...código inalterado... */
        const releaseSingles = db.tracks.filter(t => t.release === releaseId && t.trackType === 'Single'); trackSelect.innerHTML = '<option value="" disabled selected>Selecione a faixa Single...</option>'; if (releaseSingles.length === 0) { trackSelect.innerHTML = '<option value="" disabled>Nenhuma faixa "Single"</option>'; trackSelectWrapper.classList.add('hidden'); return; } releaseSingles.sort((a,b) => a.name.localeCompare(b.name)).forEach(t => { const o = document.createElement('option'); o.value = t.id; o.textContent = t.name; trackSelect.appendChild(o); }); trackSelectWrapper.classList.remove('hidden');
     }
    function updateActionLimitInfo() { /* ...código inalterado... */
        const artistId = modalArtistId.value; const actionType = actionTypeSelect.value; const artist = db.artists.find(a => a.id === artistId); if (!artist || !actionType || !ACTION_CONFIG[actionType]) { actionLimitInfo.classList.add('hidden'); return; } const config = ACTION_CONFIG[actionType]; const currentCount = artist[config.localCountKey]; const limit = config.limit; currentActionCount.textContent = currentCount; maxActionCount.textContent = limit; actionLimitInfo.classList.remove('hidden'); if (currentCount >= limit) { currentActionCount.style.color = 'var(--trend-down-red)'; confirmActionButton.disabled = true; confirmActionButton.textContent = 'Limite Atingido'; } else { currentActionCount.style.color = 'var(--text-primary)'; confirmActionButton.disabled = false; confirmActionButton.textContent = 'Confirmar Ação'; }
     }

    // Função auxiliar para dividir array em chunks (sem mudança)
    function chunkArray(array, chunkSize) { /* ...código inalterado... */
        const chunks = []; for (let i = 0; i < array.length; i += chunkSize) { chunks.push(array.slice(i, i + chunkSize)); } return chunks;
     }

    // ATUALIZADO: Função principal com distribuição aleatória para B-sides
    async function handleConfirmAction() {
        const artistId = modalArtistId.value;
        const trackId = trackSelect.value; // A-side ID
        const actionType = actionTypeSelect.value;

        if (!artistId || !trackId || !actionType) { alert("Selecione tudo."); return; }
        const artist = db.artists.find(a => a.id === artistId);
        const selectedTrack = db.tracks.find(t => t.id === trackId);
        const config = ACTION_CONFIG[actionType];
        if (!artist || !selectedTrack || !config) { alert("Erro: Dados inválidos."); return; }
        const currentCount = artist[config.localCountKey];
        if (currentCount >= config.limit) { alert("Limite atingido."); return; }

        confirmActionButton.disabled = true; confirmActionButton.textContent = 'Processando...';

        const streamsToAdd = getRandomInt(config.minStreams, config.maxStreams); // Streams para A-side
        const newCount = currentCount + 1;
        const artistPatchBody = { fields: { [config.countField]: newCount } };

        const allTrackPatchData = []; // Guarda {id, fields} para todas as faixas
        const trackUpdatesLocal = []; // Para atualizar db local {id, newStreams, gain?}

        // Dados para A-side
        const newASideStreams = selectedTrack.streams + streamsToAdd;
        allTrackPatchData.push({ id: selectedTrack.id, fields: { "Streams": newASideStreams } });
        trackUpdatesLocal.push({ id: selectedTrack.id, newStreams: newASideStreams });

        let totalBSidePoolDistributed = 0; // Para o alerta
        let otherTracksInRelease = [];

        // Prepara dados para B-sides (se for promoção)
        if (config.isPromotion) {
            const totalBSidePool = Math.floor(streamsToAdd * 0.30); // Pool total de 30%

            if (totalBSidePool > 0) {
                const releaseId = selectedTrack.release;
                otherTracksInRelease = db.tracks.filter(t => t.release === releaseId && t.id !== selectedTrack.id);
                const numBSides = otherTracksInRelease.length;

                if (numBSides > 0) {
                    // Distribuição aleatória do pool
                    const bSideGains = new Array(numBSides).fill(0); // Array para guardar ganhos de cada B-side
                    for (let i = 0; i < totalBSidePool; i++) {
                        // Escolhe um índice aleatório de B-side e adiciona 1 stream
                        const randomIndex = Math.floor(Math.random() * numBSides);
                        bSideGains[randomIndex]++;
                    }
                    totalBSidePoolDistributed = totalBSidePool; // Guarda para o alerta

                    // Prepara PATCH para cada B-side com seu ganho aleatório
                    otherTracksInRelease.forEach((otherTrack, index) => {
                        const gain = bSideGains[index];
                        if (gain > 0) { // Só adiciona se ganhou algo
                            const newOtherStreams = otherTrack.streams + gain;
                            allTrackPatchData.push({ id: otherTrack.id, fields: { "Streams": newOtherStreams } });
                            // Guarda o ganho individual para possível uso futuro no alerta (opcional)
                            trackUpdatesLocal.push({ id: otherTrack.id, newStreams: newOtherStreams, gain: gain });
                        } else {
                             // Mesmo que não ganhe streams, podemos querer atualizar localmente se a estrutura mudar
                             trackUpdatesLocal.push({ id: otherTrack.id, newStreams: otherTrack.streams, gain: 0 });
                        }
                    });
                }
            }
        }

        // Divide os dados das faixas em chunks de 10
        const trackPatchChunks = chunkArray(allTrackPatchData, 10);

        try {
            const artistPatchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Artists/${artistId}`;
            const trackPatchUrlBase = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Músicas')}`;

            const fetchOptionsPatch = {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
            };

            const allPromises = [
                fetch(artistPatchUrl, { ...fetchOptionsPatch, body: JSON.stringify(artistPatchBody) })
            ];

            trackPatchChunks.forEach(chunk => {
                const chunkPromise = fetch(trackPatchUrlBase, {
                    ...fetchOptionsPatch,
                    body: JSON.stringify({ records: chunk })
                });
                allPromises.push(chunkPromise);
            });

            const responses = await Promise.all(allPromises);
            const allOk = responses.every(response => response.ok);

            if (!allOk) {
                const failedResponse = responses.find(response => !response.ok);
                let errorDetails = failedResponse ? failedResponse.statusText : 'Erro desconhecido';
                if (failedResponse) { try { const errorJson = await failedResponse.json(); errorDetails = JSON.stringify(errorJson.error || errorJson) || errorDetails; } catch (e) { /* ignora */ } }
                const failedIndex = responses.findIndex(response => !response.ok);
                const failedEntity = failedIndex === 0 ? 'Artista' : `Faixas (chunk ${failedIndex})`;
                throw new Error(`Falha ao salvar: ${failedEntity} (${errorDetails})`);
            }

            // Se TUDO sucesso, atualizar o DB local
            artist[config.localCountKey] = newCount;
            trackUpdatesLocal.forEach(update => {
                const trackInDb = db.tracks.find(t => t.id === update.id);
                if (trackInDb) { trackInDb.streams = update.newStreams; }
            });

            // Monta mensagem de sucesso
            let alertMessage = `Ação "${actionTypeSelect.options[actionTypeSelect.selectedIndex].text}" registrada!\n\n` +
                               `+${streamsToAdd.toLocaleString('pt-BR')} streams para "${selectedTrack.name}".\n\n` +
                               `Uso: ${newCount}/${config.limit}`;
            // ATUALIZADO: Mensagem sobre a distribuição aleatória
            if (config.isPromotion && totalBSidePoolDistributed > 0 && otherTracksInRelease.length > 0) {
                 alertMessage += `\n\n${totalBSidePoolDistributed.toLocaleString('pt-BR')} streams foram distribuídos aleatoriamente entre ${otherTracksInRelease.length} outra(s) faixa(s).`;
            }
            alert(alertMessage);
            actionModal.classList.add('hidden');

        } catch (err) {
            console.error('Erro ao tentar persistir no Airtable:', err);
            alert(`Erro ao salvar ação: ${err.message}`);
            confirmActionButton.disabled = false;
            confirmActionButton.textContent = 'Confirmar Ação';
        }
    }


    // --- 5. INICIALIZAÇÃO ---

    // Listeners do Modal (sem mudança)
    releaseSelect.addEventListener('change', () => { /* ...código inalterado... */
        if (releaseSelect.value) { populateTrackSelect(releaseSelect.value); } else { trackSelectWrapper.classList.add('hidden'); }
     });
    actionTypeSelect.addEventListener('change', updateActionLimitInfo);
    trackSelect.addEventListener('change', updateActionLimitInfo);
    cancelActionButton.addEventListener('click', () => { actionModal.classList.add('hidden'); });
    confirmActionButton.addEventListener('click', handleConfirmAction);


    // Carga inicial (sem mudança)
    await loadRequiredData();
    if (db.players.length > 0 && db.artists.length > 0) {
        initializeLogin();
    } else {
         artistActionsList.innerHTML = "<p>Não foi possível carregar os dados.</p>";
    }
});
