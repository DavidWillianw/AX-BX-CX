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
        // Divulgação Normal (Valores Reduzidos ~30%)
        'promo_tv':         { limit: 20, countField: 'Promo_TV_Count',         localCountKey: 'promo_tv_count',         minStreams: 35000, maxStreams: 350000, isPromotion: true, bonusLocalKey: 'promo_tv_bonus_claimed',         bonusField: 'Promo_TV_Bonus_Claimed' },
        'promo_radio':       { limit: 20, countField: 'Promo_Radio_Count',      localCountKey: 'promo_radio_count',      minStreams: 20000, maxStreams: 50000,   isPromotion: true, bonusLocalKey: 'promo_radio_bonus_claimed',      bonusField: 'Promo_Radio_Bonus_Claimed' },
        'promo_commercial': { limit: 10, countField: 'Promo_Commercial_Count', localCountKey: 'promo_commercial_count', minStreams: 60000, maxStreams: 180000, isPromotion: true, bonusLocalKey: 'promo_commercial_bonus_claimed', bonusField: 'Promo_Commercial_Bonus_Claimed' },
        'promo_internet':   { limit: 30, countField: 'Promo_Internet_Count',   localCountKey: 'promo_internet_count',   minStreams: 10000, maxStreams: 210000, isPromotion: true, bonusLocalKey: 'promo_internet_bonus_claimed',    bonusField: 'Promo_Internet_Bonus_Claimed' },
        
        // Divulgações Especiais (Valores Reduzidos ~30%)
        'remix':            { limit: 5, countField: 'Remix_Count',            localCountKey: 'remix_count',            minStreams: 60000, maxStreams: 450000, isPromotion: false, bonusLocalKey: 'remix_bonus_claimed',            bonusField: 'Remix_Bonus_Claimed' },
        'mv':               { limit: 5, countField: 'MV_Count',               localCountKey: 'mv_count',               minStreams: 60000, maxStreams: 450000, isPromotion: false, bonusLocalKey: 'mv_bonus_claimed',                bonusField: 'MV_Bonus_Claimed' },
        'capas_alternativas': { limit: 5, countField: 'Capas_Count',          localCountKey: 'capas_count',            minStreams: 60000, maxStreams: 450000, isPromotion: false, bonusLocalKey: 'capas_bonus_claimed',          bonusField: 'Capas_Bonus_Claimed' },
        'parceria_marcas': { limit: 5, countField: 'Parceria_Count',         localCountKey: 'parceria_count',         minStreams: 60000, maxStreams: 450000, isPromotion: false, bonusLocalKey: 'parceria_bonus_claimed',      bonusField: 'Parceria_Bonus_Claimed' }
    };
    // ==================================
    // ======== FIM DA ALTERAÇÃO ========
    // ==================================

    // ==================================
    // === IMAGE_ACTION_CONFIG (NOVO) ===
    // ==================================
    // Configuração para as novas ações de imagem do artista
    const IMAGE_ACTION_CONFIG = {
        'img_serie':       { gain: { min: 1, max: 5 }, loss: { min: 1, max: 5 } },
        'img_novela':      { gain: { min: 1, max: 3 }, loss: { min: 1, max: 2 } },
        'img_filme':       { gain: { min: 1, max: 10 }, loss: { min: 1, max: 10 } },
        'img_programa_tv': { gain: { min: 1, max: 10 }, loss: { min: 1, max: 5 } },
        'img_revista':     { gain: { min: 1, max: 3 }, loss: { min: 1, max: 1 } },
        'img_tiktok':      { gain: { min: 1, max: 10 }, loss: { min: 1, max: 8 } }
    };
    // ==================================
    // ======== FIM DA ALTERAÇÃO ========
    // ==================================


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
    // ======== FIM DA ALTERAÇÃO ========
    // ==================================

    // ==================================
    // === BONUS_CONFIG (NERFADO) ===
    // ==================================
    const BONUS_CONFIG = [
        { message: "Seu single virou trilha de série da Netflix, você ganhou streams!", minGain: 150000, maxGain: 1500000 },
        { message: "Seu single recebeu aclamação da crítica, você ganhou streams!", minGain: 20000, maxGain: 200000 },
        { message: "Você fez uma performance viral em um festival, você ganhou streams!", minGain: 50000, maxGain: 500000 },
        { message: "Parabéns! Você virou trend no TikTok, você recebeu streams!", minGain: 80000, maxGain: 800000 },
        { message: "Uma celebridade compartilhou sua música nos stories, você ganhou streams!", minGain: 60000, maxGain: 600000 },
        { message: "Seu fandom fez streaming party por 24h! Você ganhou streams!", minGain: 20000, maxGain: 200000 }
    ];
    // ==================================
    // ======== FIM DA ALTERAÇÃO ========
    // ==================================


    // --- 3. LÓGICA DE AÇÕES RPG ---
    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
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
            // === ATUALIZAÇÃO TRACKS (BÔNUS) ===
            // ==================================
            db.tracks = tracksData.records.map(r => {
                const releaseId = (r.fields['Álbuns']?.[0]) || (r.fields['Singles e EPs']?.[0]) || null;
                return {
                    id: r.id,
                    name: r.fields['Nome da Faixa'] || 'Faixa?',
                    release: releaseId,
                    streams: r.fields.Streams || 0,
                    totalStreams: r.fields['Streams Totais'] || 0,
                    trackType: r.fields['Tipo de Faixa'] || 'B-side',
                    isBonusTrack: r.fields['Faixa Bônus?'] || false, // <-- NOVO
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
