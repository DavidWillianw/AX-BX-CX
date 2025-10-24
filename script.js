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


    // --- 1. CARREGAMENTO DE DADOS ---
    async function fetchAllAirtablePages(baseUrl, fetchOptions) {
        let allRecords = []; let offset = null;
        do {
            const sep = baseUrl.includes('?') ? '&' : '?';
            const url = offset ? `${baseUrl}${sep}offset=${offset}` : baseUrl;
            const res = await fetch(url, fetchOptions);
            if (!res.ok) {
                const txt = await res.text();
                console.error(`Falha ${url}: ${res.status}-${txt}`);
                throw new Error(`Fetch fail ${baseUrl}`);
            }
            const data = await res.json();
            if (data.records) {
                allRecords.push(...data.records);
            }
            offset = data.offset;
        } while (offset);
        return { records: allRecords };
    }

    async function loadRequiredData() {
        const artistsURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Artists`;
        const playersURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Jogadores`;
        const albumsURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Álbuns')}`;
        const singlesURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Singles e EPs')}`;
        const tracksURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Músicas')}`;
        const fetchOptions = { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } };

        console.log("Carregando dados...");
        try {
            const [artistsData, playersData, albumsData, singlesData, tracksData] = await Promise.all([
                fetchAllAirtablePages(artistsURL, fetchOptions),
                fetchAllAirtablePages(playersURL, fetchOptions),
                fetchAllAirtablePages(albumsURL, fetchOptions),
                fetchAllAirtablePages(singlesURL, fetchOptions),
                fetchAllAirtablePages(tracksURL, fetchOptions)
            ]);

             // Verificação essencial
             if (!artistsData || !playersData || !albumsData || !singlesData || !tracksData) {
                throw new Error('Falha ao carregar um ou mais conjuntos de dados essenciais.');
            }

            db.artists = artistsData.records.map(r => ({
                id: r.id,
                name: r.fields['Name']||'?',
                RPGPoints:r.fields.RPGPoints||0,
                LastActive:r.fields.LastActive||null,
                promo_tv_count:r.fields.Promo_TV_Count||0,
                promo_radio_count:r.fields.Promo_Radio_Count||0,
                promo_commercial_count:r.fields.Promo_Commercial_Count||0,
                promo_internet_count:r.fields.Promo_Internet_Count||0,
                remix_count:r.fields.Remix_Count||0,
                mv_count:r.fields.MV_Count||0
            }));

            db.players = playersData.records.map(r => ({
                id: r.id,
                name: r.fields['Nome'],
                artists: r.fields['Artistas']||[]
            }));

            const allReleases = [];
            albumsData.records.forEach(r => allReleases.push({
                id: r.id,
                name: r.fields['Nome do Álbum']||'Álbum?',
                artists: r.fields['Artista']||[]
            }));
            singlesData.records.forEach(r => allReleases.push({
                id: r.id,
                name: r.fields['Nome do Single/EP']||'Single?',
                artists: r.fields['Artista']||[]
            }));
            db.releases = allReleases;

            db.tracks = tracksData.records.map(r => {
                const releaseId = (r.fields['Álbuns']?.[0]) || (r.fields['Singles e EPs']?.[0]) || null;
                return {
                    id: r.id,
                    name: r.fields['Nome da Faixa']||'Faixa?',
                    release: releaseId,
                    streams: r.fields.Streams||0, // Semanal
                    totalStreams: r.fields['Streams Totais']||0, // <<< TOTAL LIDO AQUI
                    trackType: r.fields['Tipo de Faixa']||null
                };
            });

            console.log(`Dados carregados: ${db.artists.length}a, ${db.players.length}p, ${db.releases.length}r, ${db.tracks.length}t.`);

        } catch (error) {
            console.error("Erro loadData:", error);
            artistActionsList.innerHTML = `<p style="color:red;">Erro ao carregar dados: ${error.message}. Verifique o console.</p>`;
        }
    }

    // --- 2. LÓGICA DE LOGIN ---
    function loginPlayer(playerId) {
        currentPlayer = db.players.find(p => p.id === playerId);
        if (!currentPlayer) {
            console.error(`Jogador ${playerId} não encontrado.`);
            logoutPlayer(); // Limpa estado se jogador não for achado
            return;
        }
        localStorage.setItem(PLAYER_ID_KEY, playerId);
        document.getElementById('playerName').textContent = currentPlayer.name;
        loginPrompt.classList.add('hidden');
        loggedInInfo.classList.remove('hidden');
        actionsWrapper.classList.remove('hidden');
        displayArtistActions();
    }

    function logoutPlayer() {
        currentPlayer = null;
        localStorage.removeItem(PLAYER_ID_KEY);
        loginPrompt.classList.remove('hidden');
        loggedInInfo.classList.add('hidden');
        actionsWrapper.classList.add('hidden');
        artistActionsList.innerHTML = "<p>Faça login para ver as ações.</p>";
    }

    function initializeLogin() {
        if (!db.players || db.players.length === 0) {
             playerSelect.innerHTML = '<option value="" disabled selected>Nenhum jogador encontrado</option>';
             loginButton.disabled = true;
             console.warn("Nenhum jogador carregado. Login desativado.");
             return; // Sai se não há jogadores
        }

        playerSelect.innerHTML = '<option value="" disabled selected>Selecione...</option>';
        db.players.sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
            const o = document.createElement('option');
            o.value = p.id;
            o.textContent = p.name;
            playerSelect.appendChild(o);
        });

        loginButton.addEventListener('click', () => {
            if (playerSelect.value) loginPlayer(playerSelect.value);
        });
        logoutButton.addEventListener('click', logoutPlayer);

        const storedId = localStorage.getItem(PLAYER_ID_KEY);
        if (storedId && db.players.some(p => p.id === storedId)) { // Verifica se ID ainda é válido
            loginPlayer(storedId);
        } else {
            logoutPlayer(); // Limpa se ID inválido ou não existe
        }
    }

    // --- 3. LÓGICA DE AÇÕES RPG ---
    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function displayArtistActions() {
        if (!currentPlayer) return;
        const playerArtists = currentPlayer.artists
            .map(id => db.artists.find(a => a.id === id))
            .filter(Boolean) // Remove artistas não encontrados (segurança)
            .sort((a,b) => a.name.localeCompare(b.name));

        if (playerArtists.length === 0) {
            artistActionsList.innerHTML = "<p>Você não controla nenhum artista.</p>";
            return;
        }

        artistActionsList.innerHTML = playerArtists.map(artist => `
            <div class="artist-action-item" data-artist-id="${artist.id}">
                <span>${artist.name}</span>
                <div class="artist-action-buttons">
                    <button class="small-btn btn-open-modal">Selecionar Ação</button>
                </div>
            </div>`).join('');

        document.querySelectorAll('.btn-open-modal').forEach(b => {
            b.addEventListener('click', handleOpenModalClick);
        });
    }

    // --- 4. LÓGICA DO MODAL ---
    function handleOpenModalClick(event) {
        const artistId = event.currentTarget.closest('.artist-action-item').dataset.artistId;
        const artist = db.artists.find(a => a.id === artistId);
        if (!artist) return;

        modalArtistName.textContent = artist.name;
        modalArtistId.value = artist.id;

        populateReleaseSelect(artist.id); // Popula lançamentos
        actionTypeSelect.value = ""; // Reseta tipo de ação
        trackSelect.innerHTML = '<option value="" disabled selected>Selecione um lançamento primeiro</option>'; // Reseta faixas
        trackSelectWrapper.classList.add('hidden'); // Esconde seletor de faixas
        actionLimitInfo.classList.add('hidden'); // Esconde info de limite
        confirmActionButton.disabled = true; // Desabilita botão até selecionar tudo
        confirmActionButton.textContent = 'Confirmar Ação';
        actionModal.classList.remove('hidden');
    }

    function populateReleaseSelect(artistId) {
        const artistReleases = db.releases.filter(r => r.artists && r.artists.includes(artistId));
        releaseSelect.innerHTML = '<option value="" disabled selected>Selecione o Single/EP/Álbum...</option>';
        if (artistReleases.length === 0) {
            releaseSelect.innerHTML += '<option value="" disabled>Nenhum lançamento encontrado</option>';
            return;
        }
        artistReleases
            .sort((a,b) => a.name.localeCompare(b.name))
            .forEach(r => {
                const o = document.createElement('option');
                o.value = r.id;
                o.textContent = r.name;
                releaseSelect.appendChild(o);
            });
    }

    function populateTrackSelect(releaseId) {
        // Busca APENAS faixas marcadas como 'Single' (A-side) para este lançamento
        const releaseSingles = db.tracks.filter(t => t.release === releaseId && t.trackType === 'Single');
        trackSelect.innerHTML = '<option value="" disabled selected>Selecione a faixa "Single" (A-side)...</option>';

        if (releaseSingles.length === 0) {
            trackSelect.innerHTML += '<option value="" disabled>Nenhuma faixa tipo "Single" neste lançamento</option>';
            // Não esconde o wrapper, apenas informa que não há singles
            return;
        }

        releaseSingles
            .sort((a,b) => a.name.localeCompare(b.name)) // Ordena alfabeticamente
            .forEach(t => {
                const o = document.createElement('option');
                o.value = t.id;
                o.textContent = t.name;
                trackSelect.appendChild(o);
            });
        trackSelectWrapper.classList.remove('hidden'); // Mostra o seletor
    }

    function updateActionLimitInfo() {
        const artistId = modalArtistId.value;
        const actionType = actionTypeSelect.value;
        const trackId = trackSelect.value; // Verifica se a faixa foi selecionada
        const artist = db.artists.find(a => a.id === artistId);

        if (!artist || !actionType || !ACTION_CONFIG[actionType]) {
            actionLimitInfo.classList.add('hidden');
            confirmActionButton.disabled = true; // Desabilita se falta info
            return;
        }

        const config = ACTION_CONFIG[actionType];
        const currentCount = artist[config.localCountKey] || 0; // Usa 0 se undefined
        const limit = config.limit;

        currentActionCount.textContent = currentCount;
        maxActionCount.textContent = limit;
        actionLimitInfo.classList.remove('hidden');

        if (currentCount >= limit) {
            currentActionCount.style.color = 'var(--trend-down-red)';
            confirmActionButton.disabled = true;
            confirmActionButton.textContent = 'Limite Atingido';
        } else if (!trackId) { // Desabilita se a faixa não foi selecionada
             currentActionCount.style.color = 'var(--text-primary)';
             confirmActionButton.disabled = true;
             confirmActionButton.textContent = 'Selecione a Faixa';
        } else {
            currentActionCount.style.color = 'var(--text-primary)';
            confirmActionButton.disabled = false;
            confirmActionButton.textContent = 'Confirmar Ação';
        }
    }

    // Função auxiliar para dividir array em chunks
    function chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    // --- ATUALIZADO: Função principal com distribuição aleatória e atualização de Streams Totais ---
    async function handleConfirmAction() {
        const artistId = modalArtistId.value;
        const trackId = trackSelect.value; // A-side ID
        const actionType = actionTypeSelect.value;

        if (!artistId || !trackId || !actionType) { alert("Selecione artista, lançamento, faixa e tipo de ação."); return; }
        const artist = db.artists.find(a => a.id === artistId);
        const selectedTrack = db.tracks.find(t => t.id === trackId);
        const config = ACTION_CONFIG[actionType];
        if (!artist || !selectedTrack || !config) { alert("Erro: Dados inválidos (artista, faixa ou config)."); return; }
        const currentCount = artist[config.localCountKey] || 0;
        if (currentCount >= config.limit) { alert("Limite de uso para esta ação já foi atingido."); return; }

        confirmActionButton.disabled = true; confirmActionButton.textContent = 'Processando...';

        const streamsToAdd = getRandomInt(config.minStreams, config.maxStreams); // Ganho para A-side
        const newCount = currentCount + 1;
        const artistPatchBody = { fields: { [config.countField]: newCount } };

        const allTrackPatchData = []; // Guarda {id, fields} para PATCH no Airtable
        const trackUpdatesLocal = []; // Para atualizar db local {id, newStreams, newTotalStreams, gain?}

        // --- Dados para A-side ---
        const newASideStreams = (selectedTrack.streams || 0) + streamsToAdd; // Novo Semanal
        const newASideTotalStreams = (selectedTrack.totalStreams || 0) + streamsToAdd; // NOVO: Novo Total
        allTrackPatchData.push({
            id: selectedTrack.id,
            fields: {
                "Streams": newASideStreams,
                "Streams Totais": newASideTotalStreams // NOVO: Inclui total no PATCH
            }
        });
        trackUpdatesLocal.push({
            id: selectedTrack.id,
            newStreams: newASideStreams,
            newTotalStreams: newASideTotalStreams // NOVO: Guarda total para update local
        });

        let totalBSidePoolDistributed = 0;
        let otherTracksInRelease = [];

        // --- Prepara dados para B-sides (se for promoção) ---
        if (config.isPromotion) {
            const totalBSidePool = Math.floor(streamsToAdd * 0.30); // Pool total de 30%

            if (totalBSidePool > 0) {
                const releaseId = selectedTrack.release;
                if(releaseId){ // Verifica se a faixa está ligada a um lançamento
                    otherTracksInRelease = db.tracks.filter(t => t.release === releaseId && t.id !== selectedTrack.id);
                    const numBSides = otherTracksInRelease.length;

                    if (numBSides > 0) {
                        const bSideGains = new Array(numBSides).fill(0);
                        for (let i = 0; i < totalBSidePool; i++) {
                            const randomIndex = Math.floor(Math.random() * numBSides);
                            bSideGains[randomIndex]++;
                        }
                        totalBSidePoolDistributed = totalBSidePool;

                        otherTracksInRelease.forEach((otherTrack, index) => {
                            const gain = bSideGains[index];
                            if (gain > 0) {
                                const newOtherStreams = (otherTrack.streams || 0) + gain; // Novo Semanal
                                const newOtherTotalStreams = (otherTrack.totalStreams || 0) + gain; // NOVO: Novo Total
                                allTrackPatchData.push({
                                    id: otherTrack.id,
                                    fields: {
                                        "Streams": newOtherStreams,
                                        "Streams Totais": newOtherTotalStreams // NOVO: Inclui total no PATCH
                                    }
                                });
                                trackUpdatesLocal.push({
                                    id: otherTrack.id,
                                    newStreams: newOtherStreams,
                                    newTotalStreams: newOtherTotalStreams, // NOVO: Guarda total
                                    gain: gain
                                });
                            } else {
                                // Guarda estado atual para consistência local
                                trackUpdatesLocal.push({ id: otherTrack.id, newStreams: otherTrack.streams, newTotalStreams: otherTrack.totalStreams, gain: 0 });
                            }
                        });
                    }
                } else {
                    console.warn(`Faixa ${selectedTrack.name} (ID: ${selectedTrack.id}) não está associada a um lançamento. Distribuição para B-sides ignorada.`);
                }
            }
        }

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
                let errorDetails = failedResponse ? `${failedResponse.status} ${failedResponse.statusText}` : 'Erro desconhecido';
                if (failedResponse) {
                    try {
                        const errorJson = await failedResponse.json();
                        errorDetails = JSON.stringify(errorJson.error || errorJson);
                    } catch (e) { /* ignora se não conseguir ler corpo do erro */ }
                }
                const failedIndex = responses.findIndex(response => !response.ok);
                const failedEntity = failedIndex === 0 ? 'Artista' : `Faixas (chunk ${failedIndex})`;
                throw new Error(`Falha ao salvar: ${failedEntity} (${errorDetails})`);
            }

            // --- Atualizar DB local ---
            artist[config.localCountKey] = newCount;
            trackUpdatesLocal.forEach(update => {
                const trackInDb = db.tracks.find(t => t.id === update.id);
                if (trackInDb) {
                    trackInDb.streams = update.newStreams;
                    trackInDb.totalStreams = update.newTotalStreams; // <<< ATUALIZA TOTAL LOCALMENTE
                }
            });

            // --- Mensagem de sucesso ---
            let alertMessage = `Ação "${actionTypeSelect.options[actionTypeSelect.selectedIndex].text}" registrada!\n\n` +
                               `+${streamsToAdd.toLocaleString('pt-BR')} streams para "${selectedTrack.name}".\n\n` +
                               `Uso: ${newCount}/${config.limit}`;
            if (config.isPromotion && totalBSidePoolDistributed > 0 && otherTracksInRelease.length > 0) {
                 alertMessage += `\n\n${totalBSidePoolDistributed.toLocaleString('pt-BR')} streams (30%) foram distribuídos aleatoriamente entre ${otherTracksInRelease.length} outra(s) faixa(s).`;
            } else if (config.isPromotion && totalBSidePoolDistributed > 0 && otherTracksInRelease.length === 0){
                 alertMessage += `\n\nNão havia outras faixas no lançamento para distribuir os ${totalBSidePoolDistributed.toLocaleString('pt-BR')} streams extras.`;
            }
            alert(alertMessage);
            actionModal.classList.add('hidden');
            // Opcional: Atualizar a exibição da lista de artistas se quiser mostrar contagem atualizada
            // displayArtistActions();

        } catch (err) {
            console.error('Erro ao tentar persistir no Airtable:', err);
            alert(`Erro ao salvar ação: ${err.message}`);
            // Não reverter contagem local, pois o erro foi na API
        } finally {
             confirmActionButton.disabled = false; // Reabilita mesmo com erro
             confirmActionButton.textContent = 'Confirmar Ação';
             updateActionLimitInfo(); // Reavalia o estado do botão/limite
        }
    }

    // --- 5. INICIALIZAÇÃO ---
    // Listeners do Modal
    releaseSelect.addEventListener('change', () => {
        if (releaseSelect.value) {
            populateTrackSelect(releaseSelect.value); // Popula faixas
            updateActionLimitInfo(); // Atualiza limite/botão (depende da faixa também)
        } else {
            trackSelectWrapper.classList.add('hidden');
            trackSelect.innerHTML = '<option value="" disabled selected>Selecione um lançamento</option>';
            updateActionLimitInfo(); // Atualiza limite/botão
        }
    });
    actionTypeSelect.addEventListener('change', updateActionLimitInfo);
    trackSelect.addEventListener('change', updateActionLimitInfo); // Atualiza ao selecionar faixa
    cancelActionButton.addEventListener('click', () => { actionModal.classList.add('hidden'); });
    confirmActionButton.addEventListener('click', handleConfirmAction);


    // Carga inicial
    await loadRequiredData();
    // Verifica se os dados essenciais foram carregados antes de inicializar o login
    if (db.players && db.artists) {
        initializeLogin();
    } else {
        // Se loadRequiredData falhou, a mensagem de erro já deve estar em artistActionsList
        console.error("Não foi possível inicializar o login devido a erro no carregamento de dados.");
        if (artistActionsList) artistActionsList.innerHTML = "<p>Erro crítico ao carregar dados. Verifique o console.</p>";
    }
});
