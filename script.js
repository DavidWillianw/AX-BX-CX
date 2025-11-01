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
    const releaseSelectWrapper = document.getElementById('releaseSelectWrapper');
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
    const PLAYER_NAME_KEY = 'spotifyRpgActions_playerName';

    // ==================================
    // === ACTION_CONFIG (NERFADO) ===
    // ==================================
    const ACTION_CONFIG = {
        'promo_tv': { limit: 20, countField: 'Promo_TV_Count', localCountKey: 'promo_tv_count', minStreams: 35000, maxStreams: 350000, isPromotion: true, bonusLocalKey: 'promo_tv_bonus_claimed', bonusField: 'Promo_TV_Bonus_Claimed' },
        'promo_radio': { limit: 20, countField: 'Promo_Radio_Count', localCountKey: 'promo_radio_count', minStreams: 20000, maxStreams: 50000, isPromotion: true, bonusLocalKey: 'promo_radio_bonus_claimed', bonusField: 'Promo_Radio_Bonus_Claimed' },
        'promo_commercial': { limit: 10, countField: 'Promo_Commercial_Count', localCountKey: 'promo_commercial_count', minStreams: 60000, maxStreams: 180000, isPromotion: true, bonusLocalKey: 'promo_commercial_bonus_claimed', bonusField: 'Promo_Commercial_Bonus_Claimed' },
        'promo_internet': { limit: 30, countField: 'Promo_Internet_Count', localCountKey: 'promo_internet_count', minStreams: 10000, maxStreams: 210000, isPromotion: true, bonusLocalKey: 'promo_internet_bonus_claimed', bonusField: 'Promo_Internet_Bonus_Claimed' },
        'remix': { limit: 5, countField: 'Remix_Count', localCountKey: 'remix_count', minStreams: 60000, maxStreams: 450000, isPromotion: false, bonusLocalKey: 'remix_bonus_claimed', bonusField: 'Remix_Bonus_Claimed' },
        'mv': { limit: 5, countField: 'MV_Count', localCountKey: 'mv_count', minStreams: 60000, maxStreams: 450000, isPromotion: false, bonusLocalKey: 'mv_bonus_claimed', bonusField: 'MV_Bonus_Claimed' },
        'capas_alternativas': { limit: 5, countField: 'Capas_Count', localCountKey: 'capas_count', minStreams: 60000, maxStreams: 450000, isPromotion: false, bonusLocalKey: 'capas_bonus_claimed', bonusField: 'Capas_Bonus_Claimed' },
        'parceria_marcas': { limit: 5, countField: 'Parceria_Count', localCountKey: 'parceria_count', minStreams: 60000, maxStreams: 450000, isPromotion: false, bonusLocalKey: 'parceria_bonus_claimed', bonusField: 'Parceria_Bonus_Claimed' }
    };

    // ==================================
    // === IMAGE_ACTION_CONFIG (NOVO) ===
    // ==================================
    const IMAGE_ACTION_CONFIG = {
        'img_serie': { gain: { min: 1, max: 5 }, loss: { min: 1, max: 5 } },
        'img_novela': { gain: { min: 1, max: 3 }, loss: { min: 1, max: 2 } },
        'img_filme': { gain: { min: 1, max: 10 }, loss: { min: 1, max: 10 } },
        'img_programa_tv': { gain: { min: 1, max: 10 }, loss: { min: 1, max: 5 } },
        'img_revista': { gain: { min: 1, max: 3 }, loss: { min: 1, max: 1 } },
        'img_tiktok': { gain: { min: 1, max: 10 }, loss: { min: 1, max: 8 } }
    };

    // ==================================
    // === PUNISHMENT_CONFIG (NERFADO) ===
    // ==================================
    const PUNISHMENT_CONFIG = [
        { message: "Vish! Seu single foi cancelado por conteúdo impróprio, você perdeu streams.", minLoss: 35000, maxLoss: 350000 },
        { message: "Problemas de direitos autorais! Sua faixa foi retirada das plataformas, você perdeu streams.", minLoss: 60000, maxLoss: 600000 },
        { message: "O público achou seu novo clipe constrangedor, você perdeu streams.", minLoss: 20000, maxLoss: 200000 },
        { message: "Sua música foi banida em alguns países, você perdeu streams.", minLoss: 50000, maxLoss: 500000 },
        { message: "Lançamento adiado por erro da gravadora, você perdeu streams.", minLoss: 15000, maxLoss: 150000 },
        { message: "O público odiou a capa do seu single, você perdeu streams.", minLoss: 10000, maxLoss: 80000 },
        { message: "Clipe foi denunciado e tirado do ar por 48h, você perdeu streams.", minLoss: 35000, maxLoss: 350000 }
    ];

    // ==================================
    // === BONUS_CONFIG (CORRIGIDO) ===
    // ==================================
    const BONUS_CONFIG = [
        { message: "Seu single virou trilha de série da Netflix, você ganhou streams!", minGain: 150000, maxGain: 1500000 },
        { message: "Seu single recebeu aclamação da crítica, você ganhou streams!", minGain: 20000, maxGain: 200000 },
        { message: "Você fez uma performance viral em um festival, você ganhou streams!", minGain: 50000, maxGain: 500000 },
        { message: "Parabéns! Você virou trend no TikTok, você recebeu streams!", minGain: 80000, maxGain: 800000 },
        { message: "Uma celebridade compartilhou sua música nos stories, você ganhou streams!", minGain: 60000, maxGain: 600000 },
        { message: "Seu fandom fez streaming party por 24h! Você ganhou streams!", minGain: 20000, maxGain: 200000 }
    ];

    // ----------------------------------
    // --- Funções auxiliares ---
    // ----------------------------------

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function getRandomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }

    function getRandomPunishment() {
        const config = PUNISHMENT_CONFIG[Math.floor(Math.random() * PUNISHMENT_CONFIG.length)];
        const value = -getRandomInt(config.minLoss, config.maxLoss);
        return { message: config.message, value: value };
    }

    function getRandomBonus() {
        const config = BONUS_CONFIG[Math.floor(Math.random() * BONUS_CONFIG.length)];
        const value = getRandomInt(config.minGain, config.maxGain);
        return { message: config.message, value: value };
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

            if (!artistsData || !playersData || !albumsData || !singlesData || !tracksData) {
                throw new Error('Falha ao carregar um ou mais conjuntos de dados essenciais.');
            }

            // ==================================
            // === ATUALIZAÇÃO ARTISTAS (PONTOS) ===
            // ==================================
            db.artists = artistsData.records.map(r => {
                const artist = {
                    id: r.id,
                    name: r.fields['Name'] || '?',
                    RPGPoints: r.fields.RPGPoints || 0,
                    LastActive: r.fields.LastActive || null,
                    personalPoints: r.fields['Pontos Pessoais'] || 150 
                };
                for (const key in ACTION_CONFIG) {
                    const config = ACTION_CONFIG[key];
                    artist[config.localCountKey] = r.fields[config.countField] || 0;
                    artist[config.bonusLocalKey] = r.fields[config.bonusField] || false;
                }
                return artist;
            });
            // ==================================
            // ======== FIM DA ALTERAÇÃO ========
            // ==================================

            db.players = playersData.records.map(r => ({
                id: r.id,
                name: r.fields['Nome'],
                password: r.fields.Senha,
                artists: r.fields['Artistas'] || []
            }));

            // ==================================
            // === ATUALIZAÇÃO RELEASES (DELUXE) ===
            // ==================================
            const allReleases = [];
            albumsData.records.forEach(r => allReleases.push({
                id: r.id,
                name: r.fields['Nome do Álbum'] || 'Álbum?',
                artists: r.fields['Artista'] || [],
                isDeluxe: r.fields['É Deluxe?'] || false // <-- NOVO
            }));
            singlesData.records.forEach(r => allReleases.push({
                id: r.id,
                name: r.fields['Nome do Single/EP'] || 'Single?',
                artists: r.fields['Artista'] || [],
                isDeluxe: false // <-- NOVO (Singles não são deluxe)
            }));
            db.releases = allReleases;
            // ==================================
            // ======== FIM DA ALTERAÇÃO ========
            // ==================================

            // ==================================
            // === ATUALIZAÇÃO TRACKS (BÔNUS E MÚLTIPLOS RELEASES) ===
            // ==================================
            db.tracks = tracksData.records.map(r => {
                // LÓGICA ANTIGA (REMOVIDA)
                // const releaseId = (r.fields['Álbuns']?.[0]) || (r.fields['Singles e EPs']?.[0]) || null;
                
                // --- INÍCIO DA ALTERAÇÃO ---
                // Pega TODOS os IDs de álbuns e singles
                const albumIds = r.fields['Álbuns'] || [];
                const singleIds = r.fields['Singles e EPs'] || [];
                // Combina as duas listas e remove duplicatas (usando Set)
                const allReleaseIds = [...new Set([...albumIds, ...singleIds])];
                // --- FIM DA ALTERAÇÃO ---

                return {
                    id: r.id,
                    name: r.fields['Nome da Faixa'] || 'Faixa?',
                  // --- ALTERAÇÃO ---
                    // release: releaseId, // <- Antigo (string)
                    releases: allReleaseIds, // <- Novo (array)
                    // --- FIM DA ALTERAÇÃO ---
                    streams: r.fields.Streams || 0,
                   totalStreams: r.fields['Streams Totais'] || 0,
                    trackType: r.fields['Tipo de Faixa'] || 'B-side',
                    isBonusTrack: r.fields['Faixa Bônus?'] || false,
                    artistIds: r.fields['Artista'] || [],
                    collabType: r.fields['Tipo de Colaboração'] || null
                };
            });
            // ==================================
            // ======== FIM DA ALTERAÇÃO ========
            // ==================================

            console.log(`Dados carregados: ${db.artists.length}a, ${db.players.length}p, ${db.releases.length}r, ${db.tracks.length}t.`);

        } catch (error) {
            console.error("Erro loadData:", error);
            artistActionsList.innerHTML = `<p style="color:red;">Erro ao carregar dados: ${error.message}. Verifique o console.</p>`;
        }
    }

    // --- 2. LÓGICA DE LOGIN ---
    function loginPlayer(username, password) {
         if (!username || !password) {
            alert("Por favor, insira nome de usuário e senha.");
            return;
         }

        const foundPlayer = db.players.find(p => p.name.toLowerCase() === username.toLowerCase());

        if (foundPlayer && foundPlayer.password === password) {
            currentPlayer = foundPlayer;
            localStorage.setItem(PLAYER_NAME_KEY, currentPlayer.name);
            document.getElementById('playerName').textContent = currentPlayer.name;
            loginPrompt.classList.add('hidden');
            loggedInInfo.classList.remove('hidden');
            actionsWrapper.classList.remove('hidden');
            displayArtistActions();
        } else {
            alert("Usuário ou senha inválidos.");
            document.getElementById('passwordInput').value = '';
        }
    }

    function logoutPlayer() {
        currentPlayer = null;
        localStorage.removeItem(PLAYER_NAME_KEY);
        loginPrompt.classList.remove('hidden');
        loggedInInfo.classList.add('hidden');
        actionsWrapper.classList.add('hidden');
        artistActionsList.innerHTML = "<p>Faça login para ver as ações.</p>";

        document.getElementById('usernameInput').value = '';
        document.getElementById('passwordInput').value = '';
    }

    function initializeLogin() {
        if (!db.players || db.players.length === 0) {
            loginPrompt.innerHTML = '<p style="color:red;">Nenhum jogador encontrado no sistema.</p>';
            console.warn("Nenhum jogador carregado. Login desativado.");
            return;
        }

        loginButton.addEventListener('click', () => {
             const username = document.getElementById('usernameInput').value;
             const password = document.getElementById('passwordInput').value;
             loginPlayer(username, password);
        });
        logoutButton.addEventListener('click', logoutPlayer);

       const storedName = localStorage.getItem(PLAYER_NAME_KEY);
         if (storedName) {
            const storedPlayer = db.players.find(p => p.name === storedName);
            if (storedPlayer) {
                currentPlayer = storedPlayer;
                localStorage.setItem(PLAYER_NAME_KEY, currentPlayer.name);
                document.getElementById('playerName').textContent = currentPlayer.name;
                loginPrompt.classList.add('hidden');
                loggedInInfo.classList.remove('hidden');
                actionsWrapper.classList.remove('hidden');
                displayArtistActions();
            } else {
                logoutPlayer();
            }
         } else {
           logoutPlayer();
       }
    }


    // Função auxiliar para gerar float aleatório num intervalo
    function getRandomFloat(min, max) {
      return Math.random() * (max - min) + min;
    }

    function displayArtistActions() {
        if (!currentPlayer) return;
        const playerArtists = currentPlayer.artists
            .map(id => db.artists.find(a => a.id === id))
            .filter(Boolean)
            .sort((a, b) => a.name.localeCompare(b.name));

        if (playerArtists.length === 0) {
            artistActionsList.innerHTML = "<p>Você não controla nenhum artista.</p>";
            return;
        }

        artistActionsList.innerHTML = playerArtists.map(artist => `
            <div class="artist-action-item" data-artist-id="${artist.id}">
                <span>${artist.name} (Pontos: ${artist.personalPoints || 150})</span>
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

        populateReleaseSelect(artist.id);

        actionTypeSelect.value = "";
        trackSelect.innerHTML = '<option value="" disabled selected>Selecione um lançamento primeiro</option>';
        trackSelectWrapper.classList.add('hidden');
        actionLimitInfo.classList.add('hidden');
        confirmActionButton.disabled = true;
        confirmActionButton.textContent = 'Confirmar Ação';
        
        // Reseta a visibilidade
        releaseSelectWrapper.classList.remove('hidden');

        actionModal.classList.remove('hidden');
    }

    // ==================================
    // === ATUALIZAÇÃO populateReleaseSelect (DELUXE E MÚLTIPLOS RELEASES) ===
    // ==================================
    function populateReleaseSelect(artistId) {
        const mainArtistReleases = db.releases.filter(r => r.artists && r.artists.includes(artistId));
        const mainArtistReleaseIds = new Set(mainArtistReleases.map(r => r.id));

        const featuredReleaseIds = new Set();
        const actionableTypes = ['Title Track', 'Pre-release'];

        db.tracks.forEach(track => {
            // NOVO: Checa se é tipo acionável OU faixa bônus
            const isActionableType = actionableTypes.includes(track.trackType);
            const isBonus = track.isBonusTrack === true;

            // --- INÍCIO DA ALTERAÇÃO ---
            // Verifica se a track tem releases (agora é um array)
            if (track.releases && track.releases.length > 0 &&
                track.artistIds.includes(artistId) &&
                (isActionableType || isBonus)) { // <-- LÓGICA ATUALIZADA
                
                // Adiciona CADA releaseId do array ao Set
                track.releases.forEach(releaseId => {
                    featuredReleaseIds.add(releaseId);
                });
            }
            // --- FIM DA ALTERAÇÃO ---
        });

        const allReleaseIds = new Set([...mainArtistReleaseIds, ...featuredReleaseIds]);
        const allReleases = db.releases.filter(r => allReleaseIds.has(r.id));

        releaseSelect.innerHTML = '<option value="" disabled selected>Selecione o Single/EP/Álbum...</option>';
      if (allReleases.length === 0) {
            releaseSelect.innerHTML += '<option value="" disabled>Nenhum lançamento encontrado</option>';
            return;
        }

        allReleases
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(r => {
                const o = document.createElement('option');
                o.value = r.id;
                // NOVO: Adiciona (Deluxe) ao nome se for deluxe
                o.textContent = r.isDeluxe ? `${r.name} (Deluxe)` : r.name;
                releaseSelect.appendChild(o);
            });
    }
    // ==================================
    // ======== FIM DA ALTERAÇÃO ========
    // ==================================

    // ==================================
    // === ATUALIZAÇÃO populateTrackSelect (BÔNUS E MÚLTIPLOS RELEASES) ===
    // ==================================
    function populateTrackSelect(releaseId, artistId) {
        const actionableTypes = ['Title Track', 'Pre-release'];

        // NOVO: Filtro atualizado para incluir Faixa Bônus
        const releaseActionableTracks = db.tracks.filter(t => {
            const isActionableType = actionableTypes.includes(t.trackType);
            const isBonus = t.isBonusTrack === true;
            
            // --- INÍCIO DA ALTERAÇÃO ---
            // Verifica se o array 'releases' da faixa INCLUI o releaseId selecionado no dropdown
            return t.releases && t.releases.includes(releaseId) &&
                   (isActionableType || isBonus) && // <-- LÓGICA ATUALIZADA
                   t.artistIds.includes(artistId);
            // --- FIM DA ALTERAÇÃO ---
        });

        trackSelect.innerHTML = '<option value="" disabled selected>Selecione a Faixa Título / Pre-release...</option>';

        if (releaseActionableTracks.length === 0) {
            trackSelect.innerHTML += '<option value="" disabled>Nenhuma faixa acionável sua neste lançamento</option>';
            trackSelectWrapper.classList.remove('hidden');
            return;
        }

        releaseActionableTracks
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(t => {
                const o = document.createElement('option');
                o.value = t.id;
                
                // NOVO: Lógica para exibir o label correto
                let label = t.trackType;
                // Se for bônus E não for Title/Pre-release, mostra "Faixa Bônus"
               if (t.isBonusTrack && !actionableTypes.includes(t.trackType)) {
                    label = 'Faixa Bônus';
                }
                o.textContent = `${t.name} (${label})`;
                trackSelect.appendChild(o);
            });

        trackSelectWrapper.classList.remove('hidden');
    }
    // ==================================
    // ======== FIM DA ALTERAÇÃO ========
    // ==================================

    function updateActionLimitInfo() {
        const artistId = modalArtistId.value;
        const actionType = actionTypeSelect.value;
        const trackId = trackSelect.value;
        const artist = db.artists.find(a => a.id === artistId);

        // Se for ação de imagem, não faz nada (outra função cuida)
        if (!artist || !actionType || !ACTION_CONFIG[actionType]) {
            actionLimitInfo.classList.add('hidden');
           confirmActionButton.disabled = true;
            return;
        }

        const config = ACTION_CONFIG[actionType];

        if (!trackId) {
            actionLimitInfo.classList.add('hidden');
            confirmActionButton.disabled = true;
            confirmActionButton.textContent = 'Selecione a Faixa';
            return;
        }

        const track = db.tracks.find(t => t.id === trackId);
        if (!track) {
             actionLimitInfo.classList.add('hidden');
             confirmActionButton.disabled = true;
             return;
        }

        const isMain = track.artistIds[0] === artistId || track.collabType === 'Dueto/Grupo';
        
        let limit;
        if (config.limit === 5) {
             limit = 5;
        } else {
             limit = isMain ? config.limit : 5;
        }
        
        const currentCount = artist[config.localCountKey] || 0;

        currentActionCount.textContent = currentCount;
        maxActionCount.textContent = limit;
        actionLimitInfo.classList.remove('hidden');

        if (currentCount >= limit) {
            currentActionCount.style.color = 'var(--trend-down-red)';
            confirmActionButton.disabled = true;
            confirmActionButton.textContent = 'Limite Atingido';
        } else {
            currentActionCount.style.color = 'var(--text-primary)';
           confirmActionButton.disabled = false;
            confirmActionButton.textContent = 'Confirmar Ação';
        }
    }


    function chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    // ==================================
    // === LÓGICA DE AÇÃO DIVIDIDA (NOVO) ===
    // ==================================

    // 1. Roteador de Ação (Função principal chamada pelo botão)
    async function handleConfirmAction() {
        const actionType = actionTypeSelect.value;

        if (!actionType) {
            alert("Selecione um tipo de ação.");
            return;
        }

        // Se for Ação de Imagem (img_...)
        if (IMAGE_ACTION_CONFIG[actionType]) {
            await handleImageAction(actionType);
        }
        // Se for Ação de Promoção (promo_... ou especiais)
        else if (ACTION_CONFIG[actionType]) {
            await handlePromotionAction(actionType);
        }
        // Nenhuma ação válida (não deve acontecer)
        else {
            alert("Tipo de ação desconhecido.");
        }
    }

    // 2. Nova Função: Cuidar de Ações de Imagem (Pontos Pessoais)
    async function handleImageAction(actionType) {
        const artistId = modalArtistId.value;
        const artist = db.artists.find(a => a.id === artistId);
        const config = IMAGE_ACTION_CONFIG[actionType];

        if (!artist || !config) {
            alert("Erro: Artista ou configuração de ação de imagem não encontrados.");
            return;
        }

        confirmActionButton.disabled = true;
        confirmActionButton.textContent = 'Processando...';

        let pointsChange = 0;
        let message = "";
        const actionName = actionTypeSelect.options[actionTypeSelect.selectedIndex].text;

        // 50% de chance de ganhar, 50% de chance de perder
        if (Math.random() < 0.5) {
            pointsChange = getRandomInt(config.gain.min, config.gain.max);
            message = `📈 Sucesso! Sua imagem melhorou! Você ganhou +${pointsChange} pontos pessoais.`;
        } else {
            pointsChange = -getRandomInt(config.loss.min, config.loss.max);
            message = `📉 Fracasso... Sua imagem foi manchada! Você perdeu ${Math.abs(pointsChange)} pontos pessoais.`;
        }

        const currentPoints = artist.personalPoints || 150;
        const newPoints = Math.max(0, currentPoints + pointsChange); // Evita pontos negativos

        const artistPatchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Artists/${artistId}`;
        const artistPatchBody = { fields: { "Pontos Pessoais": newPoints } };
        const fetchOptionsPatch = {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(artistPatchBody)
        };

        try {
            const response = await fetch(artistPatchUrl, fetchOptionsPatch);
            if (!response.ok) {
                const errorJson = await response.json();
                throw new Error(JSON.stringify(errorJson.error || errorJson));
            }

            // Atualiza DB local
            artist.personalPoints = newPoints;
            
            // Atualiza a lista de artistas na tela
            displayArtistActions(); 

            alert(`Ação de Imagem: "${actionName}"\n\n${message}\n\nPontos Atuais: ${newPoints}`);
            actionModal.classList.add('hidden');

        } catch (err) {
            console.error('Erro ao salvar pontos pessoais:', err);
            alert(`Erro ao salvar ação: ${err.message}`);
        } finally {
            confirmActionButton.disabled = false;
            confirmActionButton.textContent = 'Confirmar Ação';
       }
    }


    // 3. Função Antiga (agora renomeada) para Ações de Promoção (Streams)
    // (MODIFICADA para incluir multiplicador e nerf de b-side)
    async function handlePromotionAction(actionType) {
        const artistId = modalArtistId.value;
        const trackId = trackSelect.value;
        // --- INÍCIO DA ALTERAÇÃO ---
        // Precisamos saber qual release o usuário SELECIONOU no dropdown
        // para distribuir os streams para as B-sides corretas.
        const selectedReleaseId = releaseSelect.value;
        // --- FIM DA ALTERAÇÃO ---

        if (!artistId || !trackId || !actionType || !selectedReleaseId) { alert("Selecione artista, lançamento, faixa e tipo de ação."); return; } // <- Verificação adicionada
        const artist = db.artists.find(a => a.id === artistId);
        const selectedTrack = db.tracks.find(t => t.id === trackId);
        const config = ACTION_CONFIG[actionType];
        if (!artist || !selectedTrack || !config) { alert("Erro: Dados inválidos (artista, faixa ou config)."); return; }

        const isMain = selectedTrack.artistIds[0] === artistId || selectedTrack.collabType === 'Dueto/Grupo';
        
        let limit;
       if (config.limit === 5) {
             limit = 5;
        } else {
             limit = isMain ? config.limit : 5;
        }

        const currentCount = artist[config.localCountKey] || 0;

        if (currentCount >= limit) {
            alert("Limite de uso para esta ação já foi atingido.");
            return;
        }

        confirmActionButton.disabled = true; confirmActionButton.textContent = 'Processando...';

        let streamsToAdd = 0;
        let eventMessage = null;
        const bonusLocalKey = config.bonusLocalKey;
        const bonusField = config.bonusField;
        const hasClaimedBonus = artist[bonusLocalKey] || false;

        const jackpotCheck = Math.random();
        const eventCheck = Math.random();  
        
        const newCount = currentCount + 1;
        const artistPatchBody = { fields: { [config.countField]: newCount } };

        // 1. Jackpot
        if (!hasClaimedBonus && jackpotCheck < 0.01) {
            streamsToAdd = 200000; // Nerfado de 200k
            eventMessage = "🎉 JACKPOT! Você viralizou inesperadamente e ganhou +200k streams! (Bônus de categoria único)";
            artistPatchBody.fields[bonusField] = true;
            artist[bonusLocalKey] = true;
        
        // 2. Bônus Aleatório
        } else if (eventCheck < 0.05) { 
            const bonus = getRandomBonus();
            streamsToAdd = bonus.value;
            eventMessage = `✨ BÔNUS! ${bonus.message}`;

        // 3. Punição Aleatória
        } else if (eventCheck >= 0.05 && eventCheck < 0.10) {
            const punishment = getRandomPunishment();
            streamsToAdd = punishment.value;
            eventMessage = `📉 PUNIÇÃO! ${punishment.message}`;

        // 4. Ganho Normal
        } else { 
            streamsToAdd = getRandomInt(config.minStreams, config.maxStreams);
        }
        
        // --- INÍCIO DA LÓGICA DE MULTIPLICADOR (NOVO) ---
        const personalPoints = artist.personalPoints || 150;
        let pointsMultiplier = 1.0;
        let pointsMessage = "";

        if (personalPoints <= 50) {
            pointsMultiplier = 0.70; // 70%
            pointsMessage = ` (Status: Cancelado 70%)`;
       } else if (personalPoints <= 99) {
            pointsMultiplier = 0.90; // 90%
            pointsMessage = ` (Status: Flop 90%)`;
        } else if (personalPoints >= 500) { // 500 ou mais
            pointsMultiplier = 1.15; // 115%
            pointsMessage = ` (Status: Em Alta +15%)`;
        }
        // Se estiver entre 100-499, o multiplicador fica 1.0 (normal)

        // Aplica o multiplicador APENAS em ganhos
        if (streamsToAdd > 0) {
            streamsToAdd = Math.floor(streamsToAdd * pointsMultiplier);
        }
        // --- FIM DA LÓGICA DE MULTIPLICADOR ---

        const allTrackPatchData = [];
        const trackUpdatesLocal = [];

        // Aplica o ganho à faixa principal (A-Side)
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

        // --- LÓGICA DE DISTRIBUIÇÃO B-SIDE (ATUALIZADA com Nerf de Álbum) ---
        let otherTracksInRelease = [];
        let totalDistributedGain = 0;
        let distributionDetails = [];

        if (config.isPromotion && streamsToAdd > 0 && isMain) {
            // --- INÍCIO DA ALTERAÇÃO ---
            // const releaseId = selectedTrack.release; // <- Lógica antiga (não funciona mais, 'release' agora é 'releases')
            const releaseId = selectedReleaseId; // <- Lógica nova: usa o ID do dropdown que o usuário selecionou
            // --- FIM DA ALTERAÇÃO ---
            
            if (releaseId) {
                // Pega todas as faixas do lançamento para checar o tamanho
                // --- INÍCIO DA ALTERAÇÃO ---
                // const allTracksInRelease = db.tracks.filter(t => t.release === releaseId); // <- Lógica antiga
                // Lógica nova: checa se o array 'releases' da faixa INCLUI o releaseId selecionado
                const allTracksInRelease = db.tracks.filter(t => t.releases && t.releases.includes(releaseId));
                // --- FIM DA ALTERAÇÃO ---
                const isLargeAlbum = allTracksInRelease.length > 30; // <-- NOVO: Checa álbum grande

                // Pega as "outras" faixas (excluindo a principal)
                otherTracksInRelease = allTracksInRelease.filter(t => t.id !== selectedTrack.id);

                // NOVO: Faixa Bônus agora NÃO é mais B-side (é acionável)
                // A distribuição só se aplica a B-sides e menores
                const bSideTypes = ['B-side']; 
                const preReleaseTypes = ['Pre-release'];
                const minorTypes = ['Intro', 'Outro', 'Skit', 'Interlude'];

                otherTracksInRelease.forEach(otherTrack => {
                    let gain = 0;
                    let percentageUsed = 0;
                    let maxPercentage = 0;
                    
                    // NOVO: Faixas bônus não recebem distribuição (pois são acionáveis)
                    if (otherTrack.isBonusTrack) {
                   	} else if (bSideTypes.includes(otherTrack.trackType)) {
                        maxPercentage = 0.30; // B-sides: máximo 30%
                        if (isLargeAlbum) {
                            maxPercentage = 0.15; // Reduzido pela metade
                        }
                    } else if (minorTypes.includes(otherTrack.trackType)) {
                       maxPercentage = 0.10; // Intros/Outros: máximo 10%
                    } else if (preReleaseTypes.includes(otherTrack.trackType)) {
                        maxPercentage = 0.95; // Pre-releases: máximo 95%
                    }

                    if (maxPercentage > 0) {
                         percentageUsed = getRandomFloat(0, maxPercentage);
                        gain = Math.floor(streamsToAdd * percentageUsed);
                    }

                    // *** ESTA LINHA ESTAVA COM O ERRO 'tS}' ***
                    if (gain > 0) {
                        totalDistributedGain += gain;
                        const newOtherStreams = (otherTrack.streams || 0) + gain;
                        const newOtherTotalStreams = (otherTrack.totalStreams || 0) + gain;
                        allTrackPatchData.push({
                            id: otherTrack.id,
                           fields: { "Streams": newOtherStreams, "Streams Totais": newOtherTotalStreams }
                        });
                        trackUpdatesLocal.push({
                            id: otherTrack.id,
                            newStreams: newOtherStreams,
                            newTotalStreams: newOtherTotalStreams,
                        });
                        let detailMsg = `   +${gain.toLocaleString('pt-BR')} para "${otherTrack.name}" (${(percentageUsed * 100).toFixed(1)}%)`;
                       	if (isLargeAlbum && bSideTypes.includes(otherTrack.trackType)) {
                            detailMsg += " (Nerf Álbum Grande)";
                        }
                        distributionDetails.push(detailMsg);
                    }
                });
            } else {
               console.warn(`(Ação de Promoção) Nenhum releaseId selecionado. Distribuição ignorada.`);
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
                allPromises.push(fetch(trackPatchUrlBase, {
                    ...fetchOptionsPatch,
                    body: JSON.stringify({ records: chunk })
               }));
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
                    } catch (e) { /* ignora */ }
                }
                const failedIndex = responses.findIndex(response => !response.ok);
             	const failedEntity = failedIndex === 0 ? 'Artista' : `Faixas (chunk ${failedIndex})`;
                throw new Error(`Falha ao salvar: ${failedEntity} (${errorDetails})`);
            }

            // ==================================
            // === INÍCIO DA CORREÇÃO APLICADA ===
            // ==================================
            // Atualiza DB local
            artist[config.localCountKey] = newCount;
            trackUpdatesLocal.forEach(update => {
                const trackInDb = db.tracks.find(t => t.id === update.id);
                if (trackInDb) {
                    trackInDb.streams = update.newStreams;
                    trackInDb.totalStreams = update.newTotalStreams; // <-- LINHA CORRIGIDA
                }
            });
            // ==================================
            // === FIM DA CORREÇÃO APLICADA ===
            // ==================================

            let alertMessage = `Ação "${actionTypeSelect.options[actionTypeSelect.selectedIndex].text}" registrada!\n\n`;
            if (eventMessage) {
                alertMessage += `${eventMessage}\n\n`;
            }

            if (streamsToAdd >= 0) {
             	alertMessage += `📈 Ganho Principal: +${streamsToAdd.toLocaleString('pt-BR')} streams para "${selectedTrack.name}"${pointsMessage}.\n\n`;
            } else {
                 alertMessage += `📉 Perda Principal: ${streamsToAdd.toLocaleString('pt-BR')} streams para "${selectedTrack.name}".\n\n`;
            }

            if (totalDistributedGain > 0) {
                alertMessage += `✨ +${totalDistributedGain.toLocaleString('pt-BR')} streams distribuídos para outras faixas:\n`;
                alertMessage += distributionDetails.join('\n');
                alertMessage += "\n\n";
            }

            alertMessage += `📊 Uso da Ação: ${newCount}/${limit}`;

            if (!isMain && config.limit !== 5) {
                alertMessage += ` (Limite de 5 usos para participações "Feat.")`;
           }

            alert(alertMessage);
            actionModal.classList.add('hidden');

        } catch (err) {
            console.error('Erro ao tentar persistir no Airtable:', err);
            alert(`Erro ao salvar ação: ${err.message}`);
        } finally {
            confirmActionButton.disabled = false;
            confirmActionButton.textContent = 'Confirmar Ação';
            updateActionLimitInfo();
        }
    }
    // ==================================
    // ======== FIM DA ALTERAÇÃO ========
    // ==================================


   // --- 5. INICIALIZAÇÃO ---
    // Listeners do Modal
    releaseSelect.addEventListener('change', () => {
        const artistId = modalArtistId.value;
        if (releaseSelect.value && artistId) {
            populateTrackSelect(releaseSelect.value, artistId);
        } else {
            trackSelectWrapper.classList.add('hidden');
        	}
    });
    
    // ==================================
    // === LISTENER ATUALIZADO (NOVO) ===
    // ==================================
    actionTypeSelect.addEventListener('change', () => {
        const actionType = actionTypeSelect.value;

        // Se for Ação de Imagem (artista)
        if (IMAGE_ACTION_CONFIG[actionType]) {
            releaseSelectWrapper.classList.add('hidden');
           	trackSelectWrapper.classList.add('hidden');
       	actionLimitInfo.classList.add('hidden');
            confirmActionButton.disabled = false;
            confirmActionButton.textContent = 'Confirmar Ação de Imagem';
        }
        // Se for Ação de Promoção (música)
        else if (ACTION_CONFIG[actionType]) {
            releaseSelectWrapper.classList.remove('hidden');
           	// A visibilidade do trackSelect é controlada pelo 'change' do releaseSelect
            // A visibilidade do limite é controlada pelo updateActionLimitInfo
            updateActionLimitInfo();
        }
        // Se for "" (nada selecionado)
        else {
            releaseSelectWrapper.classList.remove('hidden');
           	trackSelectWrapper.classList.add('hidden');
       	actionLimitInfo.classList.add('hidden');
            confirmActionButton.disabled = true;
        }
    });
    // ==================================
    // ======== FIM DA ALTERAÇÃO ========
    // ==================================

    trackSelect.addEventListener('change', updateActionLimitInfo);
    cancelActionButton.addEventListener('click', () => { actionModal.classList.add('hidden'); });
    confirmActionButton.addEventListener('click', handleConfirmAction); // <- Agora chama o roteador
    // *** O ERRO 'button-click' />' FOI REMOVIDO DAQUI ***

    // Carga inicial
    await loadRequiredData();
    if (db.players && db.artists) {
      	initializeLogin();
    } else {
        console.error("Não foi possível inicializar o login devido a erro no carregamento de dados.");
       	if (artistActionsList) artistActionsList.innerHTML = "<p>Erro crítico ao carregar dados. Verifique o console.</p>";
    }
});
