document.addEventListener('DOMContentLoaded', async () => {

    // --- VARIÁVEIS GLOBAIS ---
    let db = {
        artists: [],
        players: [],
        releases: [], // Junta Álbuns e Singles/EPs
        tracks: []      // Vem da tabela Músicas
    };
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

    // Chave localStorage (Apenas para login)
    const PLAYER_ID_KEY = 'spotifyRpgActions_playerId';

    // Configuração das Ações
    const ACTION_CONFIG = {
        'promo_tv': {
            limit: 10, countField: 'Promo_TV_Count', localCountKey: 'promo_tv_count',
            minStreams: 50000, maxStreams: 100000, isPromotion: true // NOVO: Flag para identificar promoção
        },
        'promo_radio': {
            limit: 10, countField: 'Promo_Radio_Count', localCountKey: 'promo_radio_count',
            minStreams: 30000, maxStreams: 70000, isPromotion: true
        },
        'promo_commercial': {
            limit: 5, countField: 'Promo_Commercial_Count', localCountKey: 'promo_commercial_count',
            minStreams: 10000, maxStreams: 150000, isPromotion: true
        },
        'promo_internet': {
            limit: 15, countField: 'Promo_Internet_Count', localCountKey: 'promo_internet_count',
            minStreams: 10000, maxStreams: 40000, isPromotion: true
        },
        'remix': {
            limit: 5, countField: 'Remix_Count', localCountKey: 'remix_count',
            minStreams: 25000, maxStreams: 50000, isPromotion: false // Não é promoção direta
        },
        'mv': {
            limit: 3, countField: 'MV_Count', localCountKey: 'mv_count',
            minStreams: 70000, maxStreams: 120000, isPromotion: false // Não é promoção direta
        }
    };


    // --- 1. CARREGAMENTO DE DADOS ---

    // Helper para buscar TODAS as páginas
    async function fetchAllAirtablePages(baseUrl, fetchOptions) {
        let allRecords = [];
        let offset = null;
        do {
            const separator = baseUrl.includes('?') ? '&' : '?';
            const fetchUrl = offset ? `${baseUrl}${separator}offset=${offset}` : baseUrl;
            const response = await fetch(fetchUrl, fetchOptions);
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Falha ao carregar ${fetchUrl}: ${response.status} - ${errorText}`);
                throw new Error(`Airtable fetch failed for ${baseUrl}`);
            }
            const data = await response.json();
            if (data.records) { allRecords.push(...data.records); }
            offset = data.offset;
        } while (offset);
        return { records: allRecords };
    }

    // ATUALIZADO: Carrega dados incluindo 'Tipo de Faixa'
    async function loadRequiredData() {
        const artistsURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Artists`;
        const playersURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Jogadores`;
        const albumsURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Álbuns')}`;
        const singlesURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Singles e EPs')}`;
        const tracksURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Músicas')}`;

        const fetchOptions = { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } };

        console.log("Carregando dados de 5 tabelas...");
        try {
            const [artistsData, playersData, albumsData, singlesData, tracksData] = await Promise.all([
                fetchAllAirtablePages(artistsURL, fetchOptions),
                fetchAllAirtablePages(playersURL, fetchOptions),
                fetchAllAirtablePages(albumsURL, fetchOptions),
                fetchAllAirtablePages(singlesURL, fetchOptions),
                fetchAllAirtablePages(tracksURL, fetchOptions)
            ]);

            // 1. Processar Artistas (sem mudança)
            db.artists = artistsData.records.map(record => ({
                id: record.id, name: record.fields['Name'] || 'Nome Indisponível',
                RPGPoints: record.fields.RPGPoints || 0, LastActive: record.fields.LastActive || null,
                promo_tv_count: record.fields.Promo_TV_Count || 0, promo_radio_count: record.fields.Promo_Radio_Count || 0,
                promo_commercial_count: record.fields.Promo_Commercial_Count || 0, promo_internet_count: record.fields.Promo_Internet_Count || 0,
                remix_count: record.fields.Remix_Count || 0, mv_count: record.fields.MV_Count || 0
            }));

            // 2. Processar Jogadores (sem mudança)
            db.players = playersData.records.map(record => ({
                id: record.id, name: record.fields['Nome'], artists: record.fields['Artistas'] || []
            }));

            // 3. Processar Lançamentos (sem mudança)
            const allReleases = [];
            albumsData.records.forEach(record => {
                allReleases.push({ id: record.id, name: record.fields['Nome do Álbum'] || 'Álbum s/ nome', artists: record.fields['Artista'] || [] });
            });
            singlesData.records.forEach(record => {
                allReleases.push({ id: record.id, name: record.fields['Nome do Single/EP'] || 'Single s/ nome', artists: record.fields['Artista'] || [] });
            });
            db.releases = allReleases;

            // 4. Processar Faixas (ATUALIZADO para incluir trackType)
            db.tracks = tracksData.records.map(record => {
                const releaseId = (record.fields['Álbuns'] ? record.fields['Álbuns'][0] : null) || (record.fields['Singles e EPs'] ? record.fields['Singles e EPs'][0] : null);
                return {
                    id: record.id,
                    name: record.fields['Nome da Faixa'] || 'Faixa s/ nome',
                    release: releaseId, // ID do Lançamento Pai
                    streams: record.fields.Streams || 0,
                    trackType: record.fields['Tipo de Faixa'] || null // <-- NOVO CAMPO
                };
            });

            console.log(`Dados carregados: ${db.artists.length} artistas, ${db.players.length} jogadores, ${db.releases.length} lançamentos, ${db.tracks.length} faixas.`);

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            artistActionsList.innerHTML = "<p>Erro ao carregar dados. Verifique console.</p>";
        }
    }

    // --- 2. LÓGICA DE LOGIN --- (Sem mudanças)
    function loginPlayer(playerId) { /* ...código inalterado... */
        currentPlayer = db.players.find(p => p.id === playerId);
        if (!currentPlayer) { console.error(`Jogador ${playerId} não encontrado.`); logoutPlayer(); return; }
        localStorage.setItem(PLAYER_ID_KEY, playerId);
        document.getElementById('playerName').textContent = currentPlayer.name;
        loginPrompt.classList.add('hidden'); loggedInInfo.classList.remove('hidden');
        actionsWrapper.classList.remove('hidden'); displayArtistActions();
     }
    function logoutPlayer() { /* ...código inalterado... */
         currentPlayer = null; localStorage.removeItem(PLAYER_ID_KEY);
         loginPrompt.classList.remove('hidden'); loggedInInfo.classList.add('hidden');
         actionsWrapper.classList.add('hidden'); artistActionsList.innerHTML = "<p>Faça login.</p>";
     }
    function initializeLogin() { /* ...código inalterado... */
        playerSelect.innerHTML = '<option value="" disabled selected>Selecione...</option>';
        db.players.sort((a, b) => a.name.localeCompare(b.name)).forEach(player => {
            const option = document.createElement('option'); option.value = player.id; option.textContent = player.name; playerSelect.appendChild(option);
        });
        loginButton.addEventListener('click', () => { if (playerSelect.value) loginPlayer(playerSelect.value); });
        logoutButton.addEventListener('click', logoutPlayer);
        const storedPlayerId = localStorage.getItem(PLAYER_ID_KEY);
        if (storedPlayerId) { loginPlayer(storedPlayerId); } else { artistActionsList.innerHTML = "<p>Faça login.</p>"; }
     }

    // --- 3. LÓGICA DE AÇÕES RPG ---

    // Helper de aleatoriedade (sem mudança)
    function getRandomInt(min, max) { /* ...código inalterado... */
        min = Math.ceil(min); max = Math.floor(max); return Math.floor(Math.random() * (max - min + 1)) + min;
     }

    // Mostra os artistas (sem mudança)
    function displayArtistActions() { /* ...código inalterado... */
        if (!currentPlayer) return;
        const playerArtists = currentPlayer.artists.map(id => db.artists.find(a => a.id === id)).filter(Boolean).sort((a,b) => a.name.localeCompare(b.name));
        if (playerArtists.length === 0) { artistActionsList.innerHTML = "<p>Nenhum artista lincado.</p>"; return; }
        artistActionsList.innerHTML = playerArtists.map(artist => `<div class="artist-action-item" data-artist-id="${artist.id}"><span>${artist.name}</span><div class="artist-action-buttons"><button class="small-btn btn-open-modal">Selecionar Ação</button></div></div>`).join('');
        document.querySelectorAll('.btn-open-modal').forEach(button => { button.addEventListener('click', handleOpenModalClick); });
     }

    // --- 4. LÓGICA DO MODAL ---

    // Abre o modal (sem mudança)
    function handleOpenModalClick(event) { /* ...código inalterado... */
        const artistId = event.currentTarget.closest('.artist-action-item').dataset.artistId;
        const artist = db.artists.find(a => a.id === artistId); if (!artist) return;
        modalArtistName.textContent = artist.name; modalArtistId.value = artist.id;
        populateReleaseSelect(artist.id); actionTypeSelect.value = "";
        trackSelectWrapper.classList.add('hidden'); actionLimitInfo.classList.add('hidden');
        confirmActionButton.disabled = false; confirmActionButton.textContent = 'Confirmar Ação';
        actionModal.classList.remove('hidden');
     }

    // Popula lançamentos (sem mudança)
    function populateReleaseSelect(artistId) { /* ...código inalterado... */
        const artistReleases = db.releases.filter(r => r.artists.includes(artistId));
        releaseSelect.innerHTML = '<option value="" disabled selected>Selecione...</option>';
        if (artistReleases.length === 0) { releaseSelect.innerHTML = '<option value="" disabled>Nenhum lançamento</option>'; return; }
        artistReleases.sort((a,b) => a.name.localeCompare(b.name)).forEach(release => {
            const option = document.createElement('option'); option.value = release.id; option.textContent = release.name; releaseSelect.appendChild(option);
        });
     }

    // ATUALIZADO: Popula faixas filtrando por Tipo de Faixa == 'Single'
    function populateTrackSelect(releaseId) {
        // Filtra faixas do lançamento E que são do tipo 'Single'
        const releaseSingles = db.tracks.filter(t => t.release === releaseId && t.trackType === 'Single');

        trackSelect.innerHTML = '<option value="" disabled selected>Selecione a faixa Single...</option>'; // Texto atualizado

        if (releaseSingles.length === 0) {
            trackSelect.innerHTML = '<option value="" disabled>Nenhuma faixa "Single" encontrada</option>'; // Mensagem mais clara
            trackSelectWrapper.classList.add('hidden');
            return;
        }

        // Popula apenas com os singles encontrados
        releaseSingles.sort((a,b) => a.name.localeCompare(b.name)).forEach(track => {
            const option = document.createElement('option');
            option.value = track.id;
            option.textContent = track.name;
            trackSelect.appendChild(option);
        });

        trackSelectWrapper.classList.remove('hidden');
    }


    // Atualiza info de limite (sem mudança)
    function updateActionLimitInfo() { /* ...código inalterado... */
        const artistId = modalArtistId.value; const actionType = actionTypeSelect.value;
        const artist = db.artists.find(a => a.id === artistId);
        if (!artist || !actionType || !ACTION_CONFIG[actionType]) { actionLimitInfo.classList.add('hidden'); return; }
        const config = ACTION_CONFIG[actionType]; const currentCount = artist[config.localCountKey]; const limit = config.limit;
        currentActionCount.textContent = currentCount; maxActionCount.textContent = limit;
        actionLimitInfo.classList.remove('hidden');
        if (currentCount >= limit) { currentActionCount.style.color = 'var(--trend-down-red)'; confirmActionButton.disabled = true; confirmActionButton.textContent = 'Limite Atingido'; }
        else { currentActionCount.style.color = 'var(--text-primary)'; confirmActionButton.disabled = false; confirmActionButton.textContent = 'Confirmar Ação'; }
     }


    // ATUALIZADO: Função principal para lidar com streams de B-sides
    async function handleConfirmAction() {
        const artistId = modalArtistId.value;
        const trackId = trackSelect.value; // ID da faixa A-side selecionada
        const actionType = actionTypeSelect.value;

        // Validações iniciais
        if (!artistId || !trackId || !actionType) {
            alert("Selecione lançamento, faixa Single e tipo de ação.");
            return;
        }

        const artist = db.artists.find(a => a.id === artistId);
        const selectedTrack = db.tracks.find(t => t.id === trackId);
        const config = ACTION_CONFIG[actionType];

        if (!artist || !selectedTrack || !config) {
            alert("Erro: Dados inválidos.");
            return;
        }

        // Verifica limite da ação
        const currentCount = artist[config.localCountKey];
        if (currentCount >= config.limit) {
            alert("Limite de ações atingido.");
            return;
        }

        confirmActionButton.disabled = true;
        confirmActionButton.textContent = 'Processando...';

        // 1. Calcular streams e preparar PATCH para Artista (contagem)
        const streamsToAdd = getRandomInt(config.minStreams, config.maxStreams);
        const newCount = currentCount + 1;
        const artistPatchBody = { fields: { [config.countField]: newCount } };

        // 2. Preparar PATCH(es) para Faixa(s)
        const trackPatchRequests = [];
        const trackUpdatesLocal = []; // Para atualizar db local depois

        // PATCH para a faixa A-side selecionada
        const newASideStreams = selectedTrack.streams + streamsToAdd;
        trackPatchRequests.push({
            id: selectedTrack.id,
            fields: { "Streams": newASideStreams }
        });
        trackUpdatesLocal.push({ id: selectedTrack.id, newStreams: newASideStreams });

        let bSideStreams = 0; // Streams para B-sides
        let otherTracksInRelease = []; // Guarda as B-sides para o alerta

        // Se for ação de promoção, calcula e prepara PATCH para B-sides
        if (config.isPromotion) {
            bSideStreams = Math.floor(streamsToAdd * 0.30); // 30% para B-sides

            if (bSideStreams > 0) { // Só faz sentido se for > 0
                const releaseId = selectedTrack.release; // Pega o ID do lançamento da A-side
                otherTracksInRelease = db.tracks.filter(t => t.release === releaseId && t.id !== selectedTrack.id);

                otherTracksInRelease.forEach(otherTrack => {
                    const newOtherStreams = otherTrack.streams + bSideStreams;
                    trackPatchRequests.push({
                        id: otherTrack.id,
                        fields: { "Streams": newOtherStreams }
                    });
                    trackUpdatesLocal.push({ id: otherTrack.id, newStreams: newOtherStreams });
                });
            }
        }

        // 3. Enviar PATCHes (Artista + Faixas)
        try {
            const artistPatchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Artists/${artistId}`;
            // Airtable API para PATCH em múltiplos records exige um formato diferente
            const trackPatchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Músicas')}`;

            const fetchOptionsPatch = {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
            };

            // Executa PATCH do artista e PATCH das músicas (em lote)
            // Nota: O PATCH em lote do Airtable atualiza até 10 registros por vez.
            //       Se um lançamento tiver mais de 9 B-sides (+1 A-side), precisaria dividir em chunks.
            //       Assumindo que não haverá tantos B-sides por enquanto.
            const [artistResponse, trackResponse] = await Promise.all([
                fetch(artistPatchUrl, { ...fetchOptionsPatch, body: JSON.stringify(artistPatchBody) }),
                fetch(trackPatchUrl, { ...fetchOptionsPatch, body: JSON.stringify({ records: trackPatchRequests }) }) // Envia como lote
            ]);

            if (!artistResponse.ok || !trackResponse.ok) {
                const errorA = artistResponse.statusText;
                const errorT = trackResponse.statusText;
                 // Tenta pegar mais detalhes do erro do Airtable, se disponíveis
                let errorDetailsT = '';
                 try {
                     const errorJsonT = await trackResponse.json();
                     errorDetailsT = JSON.stringify(errorJsonT.error) || errorT;
                 } catch (e) { /* ignora se não conseguir parsear o JSON */ }

                throw new Error(`Falha ao salvar: Artista (${errorA}) / Faixas (${errorDetailsT || errorT})`);
            }

            // 4. Se sucesso, atualizar o DB local
            artist[config.localCountKey] = newCount; // Atualiza contagem do artista
            trackUpdatesLocal.forEach(update => { // Atualiza streams das faixas
                const trackInDb = db.tracks.find(t => t.id === update.id);
                if (trackInDb) {
                    trackInDb.streams = update.newStreams;
                }
            });

            // Monta mensagem de sucesso
            let alertMessage = `Ação "${actionTypeSelect.options[actionTypeSelect.selectedIndex].text}" registrada!\n\n` +
                               `+${streamsToAdd.toLocaleString('pt-BR')} streams para "${selectedTrack.name}".\n\n` +
                               `Uso: ${newCount}/${config.limit}`;

            if (config.isPromotion && bSideStreams > 0 && otherTracksInRelease.length > 0) {
                alertMessage += `\n\n+${bSideStreams.toLocaleString('pt-BR')} streams adicionados para ${otherTracksInRelease.length} outra(s) faixa(s) do lançamento.`;
            }

            alert(alertMessage);
            actionModal.classList.add('hidden');

        } catch (err) {
            console.error('Erro ao tentar persistir no Airtable:', err);
            alert(`Erro ao salvar ação: ${err.message}`);
            // Não faz rollback da contagem aqui, pois o PATCH do artista pode ter funcionado
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
