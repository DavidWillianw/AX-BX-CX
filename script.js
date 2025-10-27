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

    // --- ATUALIZADO: Configuração das Ações ---
    // minStreams = 0 para todos
    // Adicionado bonusLocalKey (para db.artists) e bonusField (para Airtable)
    const ACTION_CONFIG = {
        'promo_tv':         { limit: 10, countField: 'Promo_TV_Count',         localCountKey: 'promo_tv_count',         minStreams: 0, maxStreams: 100000, isPromotion: true, bonusLocalKey: 'promo_tv_bonus_claimed',         bonusField: 'Promo_TV_Bonus_Claimed' },
        'promo_radio':      { limit: 10, countField: 'Promo_Radio_Count',      localCountKey: 'promo_radio_count',      minStreams: 0, maxStreams: 70000,  isPromotion: true, bonusLocalKey: 'promo_radio_bonus_claimed',      bonusField: 'Promo_Radio_Bonus_Claimed' },
        'promo_commercial': { limit: 5,  countField: 'Promo_Commercial_Count', localCountKey: 'promo_commercial_count', minStreams: 0, maxStreams: 150000, isPromotion: true, bonusLocalKey: 'promo_commercial_bonus_claimed', bonusField: 'Promo_Commercial_Bonus_Claimed' },
        'promo_internet':   { limit: 15, countField: 'Promo_Internet_Count',   localCountKey: 'promo_internet_count',   minStreams: 0, maxStreams: 40000,  isPromotion: true, bonusLocalKey: 'promo_internet_bonus_claimed',   bonusField: 'Promo_Internet_Bonus_Claimed' },
        'remix':            { limit: 5,  countField: 'Remix_Count',            localCountKey: 'remix_count',            minStreams: 0, maxStreams: 50000,  isPromotion: false, bonusLocalKey: 'remix_bonus_claimed',            bonusField: 'Remix_Bonus_Claimed' },
        'mv':               { limit: 3,  countField: 'MV_Count',               localCountKey: 'mv_count',               minStreams: 0, maxStreams: 120000, isPromotion: false, bonusLocalKey: 'mv_bonus_claimed',               bonusField: 'MV_Bonus_Claimed' }
    };

    // --- NOVO: Configuração de Punições ---
    const PUNISHMENT_CONFIG = [
        { message: "🚫 Opa! Você teve uma fala polêmica na tv e foi cancelada!", value: -12000 },
        { message: "📉 Seu MV foi acusado de plágio! Que situação...", value: -20000 },
        { message: "🔥 Vazou uma demo antiga sua e... não é boa.", value: -5000 },
        { message: "😲 Um influencer famoso criticou sua música.", value: -15000 },
        { message: "🤷‍♂️ A promoção não deu certo e foi ignorada pelo público.", value: -1000 }, // Punição leve
        { message: "💔 Um membro do grupo se envolveu em um escândalo de namoro!", value: -25000 }
    ];

    /**
     * Retorna um objeto de punição aleatório da lista.
     */
    function getRandomPunishment() {
        return PUNISHMENT_CONFIG[Math.floor(Math.random() * PUNISHMENT_CONFIG.length)];
    }


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

            // --- ATUALIZADO: Mapeamento dinâmico de Artistas ---
            db.artists = artistsData.records.map(r => {
                const artist = {
                    id: r.id,
                    name: r.fields['Name'] || '?',
                    RPGPoints: r.fields.RPGPoints || 0,
                    LastActive: r.fields.LastActive || null,
                };

                // Carrega dinamicamente todos os contadores E flags de bônus
                // baseados no ACTION_CONFIG
                for (const key in ACTION_CONFIG) {
                    const config = ACTION_CONFIG[key];
                    // Carrega o contador (ex: promo_tv_count)
                    artist[config.localCountKey] = r.fields[config.countField] || 0;
                    // Carrega a flag de bônus (ex: promo_tv_bonus_claimed)
                    artist[config.bonusLocalKey] = r.fields[config.bonusField] || false;
                }

                return artist;
            });

            db.players = playersData.records.map(r => ({
                id: r.id,
                name: r.fields['Nome'],
                artists: r.fields['Artistas'] || []
            }));

            const allReleases = [];
            albumsData.records.forEach(r => allReleases.push({
                id: r.id,
                name: r.fields['Nome do Álbum'] || 'Álbum?',
                artists: r.fields['Artista'] || []
            }));
            singlesData.records.forEach(r => allReleases.push({
                id: r.id,
                name: r.fields['Nome do Single/EP'] || 'Single?',
                artists: r.fields['Artista'] || []
            }));
            db.releases = allReleases;

            db.tracks = tracksData.records.map(r => {
                const releaseId = (r.fields['Álbuns']?.[0]) || (r.fields['Singles e EPs']?.[0]) || null;
                return {
                    id: r.id,
                    name: r.fields['Nome da Faixa'] || 'Faixa?',
                    release: releaseId,
                    streams: r.fields.Streams || 0, // Semanal
                    totalStreams: r.fields['Streams Totais'] || 0, // <<< TOTAL LIDO AQUI
                    // --- ATUALIZADO: Lê a lista completa de tipos ---
                    trackType: r.fields['Tipo de Faixa'] || 'B-side' // Define 'B-side' como padrão se nulo
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
            .sort((a, b) => a.name.localeCompare(b.name));

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
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(r => {
                const o = document.createElement('option');
                o.value = r.id;
                o.textContent = r.name;
                releaseSelect.appendChild(o);
            });
    }

    // --- ATUALIZADO: populateTrackSelect ---
    // Agora busca por 'Title Track' e 'Pre-release'
   // --- ATUALIZADO: populateTrackSelect ---
    // Agora busca por 'Title Track' E 'Pre-release'
    function populateTrackSelect(releaseId) {
        
        // ATUALIZADO: Busca faixas acionáveis (Title Track OU Pre-release)
        const actionableTypes = ['Title Track', 'Pre-release'];
        
        const releaseActionableTracks = db.tracks.filter(t => 
            t.release === releaseId && 
            actionableTypes.includes(t.trackType)
        );

        trackSelect.innerHTML = '<option value="" disabled selected>Selecione a Faixa Título / Pre-release...</option>';

        if (releaseActionableTracks.length === 0) {
            trackSelect.innerHTML += '<option value="" disabled>Nenhuma "Title Track" ou "Pre-release" neste lançamento</option>';
            trackSelectWrapper.classList.remove('hidden'); // Mostra mesmo se vazio para informar
            return;
        }

        releaseActionableTracks
            .sort((a, b) => a.name.localeCompare(b.name)) // Ordena alfabeticamente
            .forEach(t => {
                const o = document.createElement('option');
                o.value = t.id;
                // Mostra o tipo da faixa para o jogador saber o que está selecionando
                o.textContent = `${t.name} (${t.trackType})`; 
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

    // --- ATUALIZADO: Função principal com Bônus/Punição/Mínimo 0 ---
    async function handleConfirmAction() {
        const artistId = modalArtistId.value;
        const trackId = trackSelect.value; // ID da 'Title Track' ou 'Pre-release'
        const actionType = actionTypeSelect.value;

        if (!artistId || !trackId || !actionType) { alert("Selecione artista, lançamento, faixa e tipo de ação."); return; }
        const artist = db.artists.find(a => a.id === artistId);
        const selectedTrack = db.tracks.find(t => t.id === trackId);
        const config = ACTION_CONFIG[actionType];
        if (!artist || !selectedTrack || !config) { alert("Erro: Dados inválidos (artista, faixa ou config)."); return; }
        const currentCount = artist[config.localCountKey] || 0;
        if (currentCount >= config.limit) { alert("Limite de uso para esta ação já foi atingido."); return; }

        confirmActionButton.disabled = true; confirmActionButton.textContent = 'Processando...';

        // --- NOVO: LÓGICA DE GANHO (BÔNUS / PUNIÇÃO / NORMAL) ---
        let streamsToAdd = 0;
        let eventMessage = null; // Mensagem especial para bônus ou punição
        const bonusLocalKey = config.bonusLocalKey;
        const bonusField = config.bonusField;
        const hasClaimedBonus = artist[bonusLocalKey] || false;
        
        const bonusCheck = Math.random();
        const punishmentCheck = Math.random();
        const newCount = currentCount + 1;
        const artistPatchBody = { fields: { [config.countField]: newCount } }; // Prepara o patch do artista

        if (!hasClaimedBonus && bonusCheck < 0.01) {
            // 1% DE BÔNUS (E não foi pego ainda)
            streamsToAdd = 200000;
            eventMessage = "🎉 JACKPOT! Você viralizou inesperadamente e ganhou +200k streams! (Bônus de categoria único)";
            
            // Adiciona a flag de bônus ao patch do artista
            artistPatchBody.fields[bonusField] = true; 
            // Atualiza localmente
            artist[bonusLocalKey] = true; 

        } else if (punishmentCheck < 0.10) {
            // 10% DE PUNIÇÃO
            const punishment = getRandomPunishment();
            streamsToAdd = punishment.value; // Valor negativo
            eventMessage = punishment.message;

        } else {
            // GANHO NORMAL (Agora com mínimo 0)
            streamsToAdd = getRandomInt(config.minStreams, config.maxStreams);
        }
        // --- FIM DA LÓGICA DE GANHO ---


        const allTrackPatchData = []; // Guarda {id, fields} para PATCH no Airtable
        const trackUpdatesLocal = []; // Para atualizar db local {id, newStreams, newTotalStreams, gain?}

        // --- Dados para A-side (Track selecionada) ---
        // Garante que streams não fiquem abaixo de 0 (semanal e total)
        const newASideStreams = Math.max(0, (selectedTrack.streams || 0) + streamsToAdd);
        const newASideTotalStreams = Math.max(0, (selectedTrack.totalStreams || 0) + streamsToAdd);
        
        allTrackPatchData.push({
            id: selectedTrack.id,
            fields: {
                "Streams": newASideStreams,
                "Streams Totais": newASideTotalStreams
            }
        });
        trackUpdatesLocal.push({
            id: selectedTrack.id,
            newStreams: newASideStreams,
            newTotalStreams: newASideTotalStreams
        });

        // --- ATUALIZADO: Nova Lógica de Distribuição por Tipo de Faixa ---
        let otherTracksInRelease = [];
        let bSideGains = 0;
        let preReleaseGains = 0;
        let otherGains = 0; // Para Intro/Outro/etc

        // Só distribui ganhos se a ação for de promoção E o ganho for POSITIVO
        if (config.isPromotion && streamsToAdd > 0) {
            const releaseId = selectedTrack.release;
            if (releaseId) {
                otherTracksInRelease = db.tracks.filter(t => t.release === releaseId && t.id !== selectedTrack.id);

                // Define os tipos para facilitar
                const bSideTypes = ['B-side'];
                const preReleaseTypes = ['Pre-release'];
                const minorTypes = ['Intro', 'Outro', 'Skit', 'Interlude'];

                otherTracksInRelease.forEach(otherTrack => {
                    let gain = 0;
                    
                    if (bSideTypes.includes(otherTrack.trackType)) {
                        // B-sides ganham 30% do ganho principal
                        gain = Math.floor(streamsToAdd * 0.30);
                        bSideGains += gain;
                    } 
                    else if (preReleaseTypes.includes(otherTrack.trackType)) {
                        // Pre-releases (outras) ganham 95%
                        gain = Math.floor(streamsToAdd * 0.95);
                        preReleaseGains += gain;
                    }
                    else if (minorTypes.includes(otherTrack.trackType)) {
                        // Intro/Outro/etc ganham 10%
                        gain = Math.floor(streamsToAdd * 0.10);
                        otherGains += gain;
                    }

                    // Se houve ganho, prepara o patch
                    if (gain > 0) {
                        // Streams bônus só podem ser positivos
                        const newOtherStreams = (otherTrack.streams || 0) + gain;
                        const newOtherTotalStreams = (otherTrack.totalStreams || 0) + gain;
                        
                        allTrackPatchData.push({
                            id: otherTrack.id,
                            fields: {
                                "Streams": newOtherStreams,
                                "Streams Totais": newOtherTotalStreams
                            }
                        });
                        
                        // Atualiza o local (usado para o 'alert' e para o db local)
                        trackUpdatesLocal.push({
                            id: otherTrack.id,
                            newStreams: newOtherStreams,
                            newTotalStreams: newOtherTotalStreams,
                            gain: gain // Armazena o ganho para o alert
                        });
                    }
                }); // fim do forEach

            } else {
                console.warn(`Faixa ${selectedTrack.name} (ID: ${selectedTrack.id}) não está associada a um lançamento. Distribuição ignorada.`);
            }
        }
        // --- FIM DA NOVA LÓGICA DE DISTRIBUIÇÃO ---

        const trackPatchChunks = chunkArray(allTrackPatchData, 10);

        try {
            const artistPatchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Artists/${artistId}`;
            const trackPatchUrlBase = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Músicas')}`;
            const fetchOptionsPatch = {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
            };

            const allPromises = [
                // Envia o patch do artista (que pode conter a contagem E a flag de bônus)
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
            // (A flag de bônus já foi atualizada localmente lá em cima)
            trackUpdatesLocal.forEach(update => {
                const trackInDb = db.tracks.find(t => t.id === update.id);
                if (trackInDb) {
                    trackInDb.streams = update.newStreams;
                    trackInDb.totalStreams = update.newTotalStreams; // <<< ATUALIZA TOTAL LOCALMENTE
                }
            });

            // --- ATUALIZADO: Mensagem de sucesso ---
            let alertMessage = `Ação "${actionTypeSelect.options[actionTypeSelect.selectedIndex].text}" registrada!\n\n`;
            
            if (eventMessage) {
                alertMessage += `${eventMessage}\n\n`;
            }

            // Formata o ganho/perda da A-side
            if (streamsToAdd >= 0) {
                 alertMessage += `+${streamsToAdd.toLocaleString('pt-BR')} streams para "${selectedTrack.name}".\n\n`;
            } else {
                 alertMessage += `${streamsToAdd.toLocaleString('pt-BR')} streams para "${selectedTrack.name}".\n\n`;
            }

            alertMessage += `Uso: ${newCount}/${config.limit}`;
            
            // --- ATUALIZADO: Mensagens de Bônus por tipo ---
            if (config.isPromotion && streamsToAdd > 0) {
                if (bSideGains > 0) {
                    alertMessage += `\n\n+${bSideGains.toLocaleString('pt-BR')} streams distribuídos para B-side(s) (30%).`;
                }
                if (preReleaseGains > 0) {
                    alertMessage += `\n\n+${preReleaseGains.toLocaleString('pt-BR')} streams distribuídos para Pre-release(s) (95%).`;
                }
                if (otherGains > 0) {
                    alertMessage += `\n\n+${otherGains.toLocaleString('pt-BR')} streams distribuídos para Intro/Outro/etc (10%).`;
                }
                
                // Se não ganhou nada mas existiam outras faixas
                if (bSideGains === 0 && preReleaseGains === 0 && otherGains === 0 && otherTracksInRelease.length > 0) {
                     alertMessage += `\n\n(Nenhuma faixa bônus elegível foi encontrada para receber streams extras).`;
                }
            }
            
            alert(alertMessage);
            actionModal.classList.add('hidden');

        } catch (err) {
            console.error('Erro ao tentar persistir no Airtable:', err);
            alert(`Erro ao salvar ação: ${err.message}`);
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
