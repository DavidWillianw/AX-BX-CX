document.addEventListener('DOMContentLoaded', async () => {

    // --- VARIÁVEIS GLOBAIS ---
    let db = { artists: [], players: [] }; // Só precisamos destas tabelas
    let currentPlayer = null;
    const localActionCooldowns = {}; // Cooldowns locais

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

    // Chave diferente para o localStorage deste site
    const PLAYER_ID_KEY = 'spotifyRpgActions_playerId';

    // --- 1. CARREGAMENTO DE DADOS (SIMPLIFICADO) ---
    async function loadRequiredData() {
        const artistsURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Artists`; // Pega todos os artistas
        const playersURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Jogadores`;

        const fetchOptions = { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } };

        console.log("Carregando dados de Jogadores e Artistas...");
        try {
            const [artistsResponse, playersResponse] = await Promise.all([
                fetch(artistsURL, fetchOptions),
                fetch(playersURL, fetchOptions)
            ]);

            if (!artistsResponse.ok || !playersResponse.ok) {
                throw new Error('Falha ao carregar Jogadores ou Artistas.');
            }

            const artistsData = await artistsResponse.json();
            const playersData = await playersResponse.json();

            db.artists = artistsData.records.map(record => ({
                id: record.id,
                name: record.fields.Name || 'Nome Indisponível',
                RPGPoints: record.fields.RPGPoints || 0,
                LastActive: record.fields.LastActive || null // Guarda LastActive para uso futuro
            }));

            db.players = playersData.records.map(record => ({
                id: record.id,
                name: record.fields.Nome,
                artists: record.fields.Artistas || []
            }));

            console.log("Dados carregados.");

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            artistActionsList.innerHTML = "<p>Erro ao carregar dados do Airtable.</p>";
        }
    }

    // --- 2. LÓGICA DE LOGIN ---
    function loginPlayer(playerId) {
        currentPlayer = db.players.find(p => p.id === playerId);
        if (!currentPlayer) return;

        localStorage.setItem(PLAYER_ID_KEY, playerId); // Usa a chave específica

        document.getElementById('playerName').textContent = currentPlayer.name;
        loginPrompt.classList.add('hidden');
        loggedInInfo.classList.remove('hidden');
        actionsWrapper.classList.remove('hidden');

        // Mostra as ações para os artistas deste jogador
        displayArtistActions();
    }

    function logoutPlayer() {
        currentPlayer = null;
        localStorage.removeItem(PLAYER_ID_KEY); // Usa a chave específica

        loginPrompt.classList.remove('hidden');
        loggedInInfo.classList.add('hidden');
        actionsWrapper.classList.add('hidden');
        artistActionsList.innerHTML = "<p>Faça login para ver as ações.</p>";
    }

    function initializeLogin() {
        // Popula o dropdown de jogadores
        playerSelect.innerHTML = '<option value="" disabled selected>Selecione seu nome...</option>';
        db.players.forEach(player => {
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

        // Verifica login anterior
        const storedPlayerId = localStorage.getItem(PLAYER_ID_KEY); // Usa a chave específica
        if (storedPlayerId) {
            loginPlayer(storedPlayerId);
        } else {
             artistActionsList.innerHTML = "<p>Faça login para ver as ações.</p>";
        }
    }

    // --- 3. LÓGICA DE AÇÕES RPG ---

    /**
     * Mostra a lista de artistas do jogador logado com os botões de ação.
     */
    function displayArtistActions() {
        if (!currentPlayer) return;

        const playerArtists = currentPlayer.artists
            .map(artistId => db.artists.find(a => a.id === artistId))
            .filter(Boolean); // Filtra artistas não encontrados

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

        // Adiciona listeners aos novos botões
        document.querySelectorAll('.btn-action').forEach(button => {
            button.addEventListener('click', handleActionButtonClick);
        });

        // Inicia a verificação de cooldowns para todos os botões visíveis
        startCooldownChecks();
    }

    /**
     * Handler para cliques nos botões de ação
     */
    async function handleActionButtonClick(event) {
        if (!currentPlayer) return;

        const button = event.currentTarget;
        const action = button.dataset.action;
        const artistItem = button.closest('.artist-action-item');
        const artistId = artistItem.dataset.artistId;

        // Desabilita o botão imediatamente para feedback
        button.disabled = true;

        await performRPGAction(action, artistId);

        // A função performRPGAction já lida com o cooldown,
        // mas precisamos iniciar o timer visual
        startCooldownChecksForArtist(artistId);
    }

    /**
     * Verifica se uma ação está em cooldown e retorna o tempo restante em ms
     */
    function getCooldownTimeLeft(artistId, actionKey) {
        const cooldownSeconds = getCooldownSecondsForAction(actionKey); // Pega a duração correta
        const key = `${artistId}_${actionKey}`;
        const now = Date.now();
        const endTime = localActionCooldowns[key] || 0;
        const timeLeft = endTime - now;
        return timeLeft > 0 ? timeLeft : 0;
    }


    /**
     * Atualiza o estado visual (disabled, texto) de um botão baseado no cooldown
     */
     function updateButtonCooldownState(button) {
        const artistId = button.closest('.artist-action-item').dataset.artistId;
        const actionKey = button.dataset.action;
        const timeLeft = getCooldownTimeLeft(artistId, actionKey);
        const cooldownDisplay = button.closest('.artist-action-buttons').querySelector('.cooldown-display');

        if (timeLeft > 0) {
            button.disabled = true;
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            // Mostra cooldown APENAS para o botão atual
             if (cooldownDisplay) {
                 cooldownDisplay.textContent = `(${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')})`;
             }

            // Re-verifica em 1 segundo
            setTimeout(() => updateButtonCooldownState(button), 1000);
        } else {
            button.disabled = false;
            if (cooldownDisplay) {
                 cooldownDisplay.textContent = ''; // Limpa o display
            }
        }
    }


    /**
     * Inicia a verificação de cooldown para todos os botões de um artista
     */
    function startCooldownChecksForArtist(artistId) {
        const artistItem = artistActionsList.querySelector(`.artist-action-item[data-artist-id="${artistId}"]`);
        if (!artistItem) return;

        const buttons = artistItem.querySelectorAll('.btn-action');
        buttons.forEach(button => {
             updateButtonCooldownState(button); // Inicia a checagem/timer para cada botão
        });
    }

    /**
     * Inicia a verificação para todos os artistas visíveis
     */
    function startCooldownChecks() {
         document.querySelectorAll('.artist-action-item').forEach(item => {
             startCooldownChecksForArtist(item.dataset.artistId);
         });
    }

    /**
     * Retorna os segundos de cooldown para uma ação específica
     */
    function getCooldownSecondsForAction(action) {
        const cooldownMapSec = { promo: 60 * 2, remix: 60 * 5, event_win: 60 * 10, collab: 60 * 4 };
        return cooldownMapSec[action] || 60 * 1; // Default 1 min
    }


    /**
     * Executa a ação RPG e salva no Airtable (versão adaptada)
     */
    async function performRPGAction(action, artistId) {
        // Login e Propriedade já verificados no handler

        const actionPointsMap = { promo: 30, remix: 70, event: 40, event_win: 120, collab: 20 };
        const points = actionPointsMap[action] || 0;
        const cooldownSec = getCooldownSecondsForAction(action);

        if (points === 0) {
            console.warn(`Ação '${action}' não configurada.`);
            // Reabilita o botão se a ação for inválida
             const button = artistActionsList.querySelector(`.artist-action-item[data-artist-id="${artistId}"] .btn-action[data-action="${action}"]`);
             if (button) button.disabled = false;
            return;
        }

        const timeLeft = getCooldownTimeLeft(artistId, action); // Usa a função correta
        if (timeLeft > 0) {
          console.log(`Ação '${action}' para ${artistId} em cooldown.`);
          // O timer visual já está rodando, não precisa de alert
          // Reabilita o botão visualmente pois o timer cuidará disso
           const button = artistActionsList.querySelector(`.artist-action-item[data-artist-id="${artistId}"] .btn-action[data-action="${action}"]`);
           if (button) updateButtonCooldownState(button); // Atualiza o estado
          return;
        }

        // Define o cooldown ANTES da chamada API
        const endTime = Date.now() + (cooldownSec * 1000);
        localActionCooldowns[`${artistId}_${action}`] = endTime;

        // Inicia o timer visual imediatamente
        const button = artistActionsList.querySelector(`.artist-action-item[data-artist-id="${artistId}"] .btn-action[data-action="${action}"]`);
        if (button) updateButtonCooldownState(button);


        // Encontra o artista no DB local para pegar os pontos atuais
        const artistEntryLocal = db.artists.find(a => a.id === artistId);
        const currentPoints = artistEntryLocal ? artistEntryLocal.RPGPoints : 0; // Pega pontos do DB local
        const newPoints = currentPoints + points;
        const newLastActive = new Date().toISOString();

        console.log(`Aplicando ${points} pts para ${artistId}. Novo total: ${newPoints}`);

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

          // Atualiza o DB local após sucesso
          if(artistEntryLocal) {
              artistEntryLocal.RPGPoints = newPoints;
              artistEntryLocal.LastActive = newLastActive;
          }

        } catch (err) {
          console.error('Erro ao tentar persistir no Airtable:', err);
          alert(`Erro ao salvar ação: ${err.message}`);
          // Remove o cooldown local se a API falhar
          delete localActionCooldowns[`${artistId}_${action}`];
          // Atualiza o estado do botão para reabilitá-lo visualmente
           if (button) updateButtonCooldownState(button);
        }
    }

    // --- 4. INICIALIZAÇÃO GERAL ---
    await loadRequiredData();
    initializeLogin();

});
