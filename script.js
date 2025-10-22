document.addEventListener('DOMContentLoaded', async () => {

    // --- VARIÁVEIS GLOBAIS ---
    let db = { artists: [], players: [] };
    let currentPlayer = null;
    // const localActionCooldowns = {}; // REMOVED - Now using localStorage

    // IDs da base (mesmos do outro site)
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

    // Chaves localStorage (específicas para esta página)
    const PLAYER_ID_KEY = 'spotifyRpgActions_playerId';
    const COOLDOWNS_KEY = 'spotifyRpgActions_cooldowns'; // Chave para cooldowns

    // --- 1. CARREGAMENTO DE DADOS ---

    // Helper para buscar TODAS as páginas (Copied from main site)
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
            if (data.records) {
                allRecords.push(...data.records);
            }
            offset = data.offset;

        } while (offset);

        return { records: allRecords };
    }


    // CORRIGIDO: Usa fetchAllAirtablePages
    async function loadRequiredData() {
        const artistsURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Artists`; // Pega todos
        const playersURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Jogadores`;

        const fetchOptions = { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } };

        console.log("Carregando dados de Jogadores e Artistas (com paginação)...");
        try {
            const [artistsData, playersData] = await Promise.all([
                fetchAllAirtablePages(artistsURL, fetchOptions), // CORRIGIDO
                fetchAllAirtablePages(playersURL, fetchOptions)  // CORRIGIDO
            ]);

             if (!artistsData || !playersData) {
                 throw new Error('Falha ao carregar Jogadores ou Artistas (paginação).');
            }

            db.artists = artistsData.records.map(record => ({
                id: record.id,
                name: record.fields.Name || 'Nome Indisponível',
                RPGPoints: record.fields.RPGPoints || 0,
                LastActive: record.fields.LastActive || null
            }));

            db.players = playersData.records.map(record => ({
                id: record.id,
                name: record.fields.Nome,
                artists: record.fields.Artistas || []
            }));

            console.log(`Dados carregados: ${db.artists.length} artistas, ${db.players.length} jogadores.`);

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            artistActionsList.innerHTML = "<p>Erro ao carregar dados do Airtable.</p>";
        }
    }

    // --- 2. LÓGICA DE LOGIN ---
    function loginPlayer(playerId) {
        currentPlayer = db.players.find(p => p.id === playerId);
        if (!currentPlayer) {
             console.error(`Jogador com ID ${playerId} não encontrado no DB local.`);
             logoutPlayer(); // Força logout se o ID não for válido
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
        playerSelect.innerHTML = '<option value="" disabled selected>Selecione seu nome...</option>';
        // Ordena jogadores por nome para o dropdown
        db.players.sort((a, b) => a.name.localeCompare(b.name)).forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.name;
            playerSelect.appendChild(option);
        });

        loginButton.addEventListener('click', () => {
            const selectedPlayerId = playerSelect.value;
            if (selectedPlayerId) loginPlayer(selectedPlayerId);
        });
        logoutButton.addEventListener('click', logoutPlayer);

        const storedPlayerId = localStorage.getItem(PLAYER_ID_KEY);
        if (storedPlayerId) {
            // Tenta logar, a função loginPlayer verifica se o ID ainda é válido
            loginPlayer(storedPlayerId);
        } else {
             artistActionsList.innerHTML = "<p>Faça login para ver as ações.</p>";
        }
    }

    // --- 3. LÓGICA DE AÇÕES RPG ---

    /**
     * Carrega os cooldowns salvos no localStorage.
     */
    function loadCooldownsFromStorage() {
        const savedCooldowns = localStorage.getItem(COOLDOWNS_KEY);
        return savedCooldowns ? JSON.parse(savedCooldowns) : {};
    }

    /**
     * Salva os cooldowns atuais no localStorage.
     */
    function saveCooldownsToStorage(cooldowns) {
        localStorage.setItem(COOLDOWNS_KEY, JSON.stringify(cooldowns));
    }


    function displayArtistActions() {
        if (!currentPlayer) return;

        const playerArtists = currentPlayer.artists
            .map(artistId => db.artists.find(a => a.id === artistId))
            .filter(Boolean) // Remove nulls/undefineds se um artista linkado for deletado
            .sort((a,b) => a.name.localeCompare(b.name)); // Ordena por nome

        if (playerArtists.length === 0) {
            artistActionsList.innerHTML = "<p>Você ainda não possui artistas cadastrados ou lincados.</p>";
            return;
        }

        artistActionsList.innerHTML = playerArtists.map(artist => `
            <div class="artist-action-item" data-artist-id="${artist.id}">
                <span>${artist.name}</span>
                <div class="artist-action-buttons">
                    <button class="small-btn btn-action" data-action="promo">Divulgar</button>
                    <button class="small-btn btn-action" data-action="remix">Lançar Remix</button>
                    <span class="cooldown-display"></span>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.btn-action').forEach(button => {
            button.addEventListener('click', handleActionButtonClick);
        });

        startCooldownChecks(); // Inicia verificação visual
    }

    async function handleActionButtonClick(event) {
        if (!currentPlayer) return;

        const button = event.currentTarget;
        const action = button.dataset.action;
        const artistItem = button.closest('.artist-action-item');
        const artistId = artistItem.dataset.artistId;

        button.disabled = true; // Desabilita visualmente

        // Ação principal (verifica cooldown interno, faz PATCH, atualiza cooldown)
        await performRPGAction(action, artistId);

        // Atualiza o estado visual do botão (pode reabilitar se falhar ou iniciar timer)
        updateButtonCooldownState(button);
    }

    /**
     * CORRIGIDO: Lê cooldowns do localStorage
     */
    function getCooldownTimeLeft(artistId, actionKey) {
        const cooldowns = loadCooldownsFromStorage();
        const key = `${artistId}_${actionKey}`;
        const now = Date.now();
        const endTime = cooldowns[key] || 0;
        const timeLeft = endTime - now;

        // Limpa cooldowns expirados do localStorage (opcional, mas bom para higiene)
        if (timeLeft <= 0 && cooldowns[key]) {
             delete cooldowns[key];
             saveCooldownsToStorage(cooldowns);
        }

        return timeLeft > 0 ? timeLeft : 0;
    }


    function updateButtonCooldownState(button) {
        const artistId = button.closest('.artist-action-item')?.dataset.artistId; // Safetynav
        const actionKey = button.dataset.action;
        if (!artistId) return; // Sai se não encontrar o ID do artista

        const timeLeft = getCooldownTimeLeft(artistId, actionKey);
        const cooldownDisplay = button.closest('.artist-action-buttons')?.querySelector('.cooldown-display'); // Safetynav

        if (timeLeft > 0) {
            button.disabled = true;
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

             if (cooldownDisplay) {
                 cooldownDisplay.textContent = `(${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')})`;
             }

            // Re-verifica em 1 segundo
            setTimeout(() => updateButtonCooldownState(button), 1000);
        } else {
            button.disabled = false;
            if (cooldownDisplay) {
                 cooldownDisplay.textContent = '';
            }
        }
    }


    function startCooldownChecksForArtist(artistId) {
        const artistItem = artistActionsList.querySelector(`.artist-action-item[data-artist-id="${artistId}"]`);
        if (!artistItem) return;

        const buttons = artistItem.querySelectorAll('.btn-action');
        buttons.forEach(button => {
             updateButtonCooldownState(button);
        });
    }

    function startCooldownChecks() {
         document.querySelectorAll('.artist-action-item').forEach(item => {
             startCooldownChecksForArtist(item.dataset.artistId);
         });
    }

    function getCooldownSecondsForAction(action) {
        // Cooldowns em SEGUNDOS
        const cooldownMapSec = {
            promo: 60 * 2,    // 2 minutos
            remix: 60 * 5,    // 5 minutos
            event: 60 * 1,    // 1 minuto (exemplo, não usado nos botões atuais)
            event_win: 60 * 10, // 10 minutos (exemplo)
            collab: 60 * 4    // 4 minutos (exemplo)
        };
        return cooldownMapSec[action] || 60 * 1; // Default 1 min
    }


    /**
     * CORRIGIDO: Salva cooldown no localStorage e atualiza DB local
     */
    async function performRPGAction(action, artistId) {
        const actionPointsMap = { promo: 30, remix: 70 }; // Ações disponíveis nos botões
        const points = actionPointsMap[action] || 0;
        const cooldownSec = getCooldownSecondsForAction(action);

        if (points === 0) {
            console.warn(`Ação '${action}' não configurada.`);
            return false; // Indica falha
        }

        const timeLeft = getCooldownTimeLeft(artistId, action);
        if (timeLeft > 0) {
            console.log(`Ação '${action}' para ${artistId} em cooldown.`);
            // O timer visual já está tratando disso
            return false; // Indica falha (em cooldown)
        }

        // --- Atualização Otimista do Cooldown (assume sucesso) ---
        const cooldowns = loadCooldownsFromStorage();
        const endTime = Date.now() + (cooldownSec * 1000);
        cooldowns[`${artistId}_${action}`] = endTime;
        saveCooldownsToStorage(cooldowns);
        // --- Fim da Atualização Otimista ---

        const artistEntryLocal = db.artists.find(a => a.id === artistId);
        const currentPoints = artistEntryLocal ? artistEntryLocal.RPGPoints : 0;
        const newPoints = currentPoints + points;
        const newLastActive = new Date().toISOString(); // Formato ISO 8601 exigido pelo Airtable

        console.log(`Aplicando ${points} pts para ${artistId}. Novo total (tentativa): ${newPoints}`);

        try {
            const patchBody = { fields: { 'RPGPoints': newPoints, 'LastActive': newLastActive } };
            const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Artists/${artistId}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(patchBody)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Falha ao salvar no Airtable: ${JSON.stringify(errorData.error)}`);
            }
            console.log(`Ação '${action}' de ${artistId} salva no Airtable.`);

            // CORRIGIDO: Atualiza o DB local APÓS sucesso da API
            if(artistEntryLocal) {
                artistEntryLocal.RPGPoints = newPoints;
                artistEntryLocal.LastActive = newLastActive;
            }
            return true; // Indica sucesso

        } catch (err) {
            console.error('Erro ao tentar persistir no Airtable:', err);
            alert(`Erro ao salvar ação: ${err.message}`);

            // Rollback do cooldown local se a API falhar
            const currentCooldowns = loadCooldownsFromStorage();
            delete currentCooldowns[`${artistId}_${action}`];
            saveCooldownsToStorage(currentCooldowns);

            return false; // Indica falha
        }
    }

    // --- 4. INICIALIZAÇÃO GERAL ---
    await loadRequiredData();
    // Só inicializa o login se os dados foram carregados
    if (db.players.length > 0 && db.artists.length > 0) {
        initializeLogin();
    } else {
         artistActionsList.innerHTML = "<p>Não foi possível carregar os dados necessários. Verifique o console.</p>";
    }


});
