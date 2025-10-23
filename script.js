document.addEventListener('DOMContentLoaded', async () => {

    // --- VARIÁVEIS GLOBAIS ---
    let db = { 
        artists: [], 
        players: [],
        releases: [], // ATUALIZADO: Será preenchido por 'Álbums' e 'Singles e EPs'
        tracks: []      // ATUALIZADO: Virá da tabela 'Músicas'
    };
    let currentPlayer = null;

    // IDs da base
    const AIRTABLE_BASE_ID = 'appG5NOoblUmtSMVI';
    const AIRTABLE_API_KEY = 'pat5T28kjmJ4t6TQG.69bf34509e687fff6a3f76bd52e64518d6c92be8b1ee0a53bcc9f50fedcb5c70';

    // Elementos da UI (sem mudanças)
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

    // Configuração das Ações (Confirmada por você)
    const ACTION_CONFIG = {
        'promo_tv': { 
            limit: 10, 
            countField: 'Promo_TV_Count',
            localCountKey: 'promo_tv_count', 
            minStreams: 50000, 
            maxStreams: 100000 
        },
        'promo_radio': { 
            limit: 10, 
            countField: 'Promo_Radio_Count',
            localCountKey: 'promo_radio_count',
            minStreams: 30000, 
            maxStreams: 70000 
        },
        'promo_commercial': {
            limit: 5, 
            countField: 'Promo_Commercial_Count',
            localCountKey: 'promo_commercial_count',
            minStreams: 10000, 
            maxStreams: 150000
        },
        'promo_internet': {
            limit: 15, 
            countField: 'Promo_Internet_Count',
            localCountKey: 'promo_internet_count',
            minStreams: 10000, 
            maxStreams: 40000 
        },
        'remix': { 
            limit: 5, 
            countField: 'Remix_Count',
            localCountKey: 'remix_count',
            minStreams: 25000, 
            maxStreams: 50000 
        },
        'mv': { 
            limit: 3, 
            countField: 'MV_Count',
            localCountKey: 'mv_count',
            minStreams: 70000, 
            maxStreams: 120000 
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
            if (data.records) {
                allRecords.push(...data.records);
            }
            offset = data.offset;
        } while (offset);
        return { records: allRecords };
    }

    // ATUALIZADO: Carrega todos os dados necessários de 5 tabelas
// ATUALIZADO: Carrega todos os dados necessários de 5 tabelas
    async function loadRequiredData() {
        // CORREÇÃO: Nomes das tabelas com caracteres especiais/espaços precisam ser codificados
        const artistsURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Artists`; // ASCII, OK
        const playersURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Jogadores`; // ASCII, OK
        
        // CORRIGIDO: Adiciona encodeURIComponent para nomes de tabelas
        const albumsURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Álbums')}`;
        const singlesURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Singles e EPs')}`;
        const tracksURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Músicas')}`;
        
        const fetchOptions = { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } };

        console.log("Carregando dados de 5 tabelas (com URL codificada)...");
        try {
            // ATUALIZADO: Busca de 5 tabelas em paralelo
            const [artistsData, playersData, albumsData, singlesData, tracksData] = await Promise.all([
                fetchAllAirtablePages(artistsURL, fetchOptions),
                fetchAllAirtablePages(playersURL, fetchOptions),
                fetchAllAirtablePages(albumsURL, fetchOptions),  // CORRIGIDO
                fetchAllAirtablePages(singlesURL, fetchOptions), // CORRIGIDO
                fetchAllAirtablePages(tracksURL, fetchOptions)   // CORRIGIDO
            ]);

            // 1. Processar Artistas
            db.artists = artistsData.records.map(record => ({
                id: record.id,
                name: record.fields.Name || 'Nome Indisponível',
                RPGPoints: record.fields.RPGPoints || 0,
                LastActive: record.fields.LastActive || null,
                promo_tv_count: record.fields.Promo_TV_Count || 0,
                promo_radio_count: record.fields.Promo_Radio_Count || 0,
                promo_commercial_count: record.fields.Promo_Commercial_Count || 0,
                promo_internet_count: record.fields.Promo_Internet_Count || 0,
                remix_count: record.fields.Remix_Count || 0,
                mv_count: record.fields.MV_Count || 0
            }));

            // 2. Processar Jogadores
            db.players = playersData.records.map(record => ({
                id: record.id,
                name: record.fields.Nome,
                artists: record.fields.Artistas || []
            }));

            // 3. ATUALIZADO: Processar Lançamentos (Juntando Álbuns e Singles)
            const allReleases = [];
            albumsData.records.forEach(record => {
                allReleases.push({
                    id: record.id,
                    name: record.fields.Name || 'Álbum sem nome',
                    artists: record.fields.Artistas || []
                });
            });
            singlesData.records.forEach(record => {
                allReleases.push({
                    id: record.id,
                    name: record.fields.Name || 'Single/EP sem nome',
                    artists: record.fields.Artistas || []
                });
            });
            db.releases = allReleases;

            // 4. ATUALIZADO: Processar Faixas (da tabela Músicas)
            db.tracks = tracksData.records.map(record => {
                const releaseId = (record.fields['Álbum'] ? record.fields['Álbum'][0] : null) || 
                                  (record.fields['Single/EP'] ? record.fields['Single/EP'][0] : null);
                
                return {
                    id: record.id,
                    name: record.fields.Name || 'Faixa sem nome',
                    release: releaseId,
                    streams: record.fields.Streams || 0
                };
            });

            console.log(`Dados carregados: ${db.artists.length} artistas, ${db.players.length} jogadores, ${db.releases.length} lançamentos (Álbuns + Singles), ${db.tracks.length} faixas.`);

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            artistActionsList.innerHTML = "<p>Erro ao carregar dados do Airtable. Verifique o console e as permissões do seu token.</p>";
        }
    }

    // --- 2. LÓGICA DE LOGIN ---
    // (Sem mudanças, esta parte estava correta)
    function loginPlayer(playerId) {
        currentPlayer = db.players.find(p => p.id === playerId);
        if (!currentPlayer) {
             console.error(`Jogador com ID ${playerId} não encontrado no DB local.`);
             logoutPlayer(); 
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
            loginPlayer(storedPlayerId);
        } else {
             artistActionsList.innerHTML = "<p>Faça login para ver as ações.</p>";
        }
    }

    // --- 3. LÓGICA DE AÇÕES RPG ---
    // (Sem mudanças, esta parte estava correta)

    // Helper de aleatoriedade
    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Mostra os artistas com o botão "Selecionar Ação"
    function displayArtistActions() {
        if (!currentPlayer) return;

        const playerArtists = currentPlayer.artists
            .map(artistId => db.artists.find(a => a.id === artistId))
            .filter(Boolean)
            .sort((a,b) => a.name.localeCompare(b.name));

        if (playerArtists.length === 0) {
            artistActionsList.innerHTML = "<p>Você ainda não possui artistas cadastrados ou lincados.</p>";
            return;
        }

        artistActionsList.innerHTML = playerArtists.map(artist => `
            <div class="artist-action-item" data-artist-id="${artist.id}">
                <span>${artist.name}</span>
                <div class="artist-action-buttons">
                    <button class="small-btn btn-open-modal">Selecionar Ação</button>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.btn-open-modal').forEach(button => {
            button.addEventListener('click', handleOpenModalClick);
        });
    }

    // --- 4. LÓGICA DO MODAL ---
    // (Sem mudanças, esta parte estava correta e agora recebe os dados certos)

    // Abre o modal e popula com dados do artista
    function handleOpenModalClick(event) {
        const artistId = event.currentTarget.closest('.artist-action-item').dataset.artistId;
        const artist = db.artists.find(a => a.id === artistId);
        if (!artist) return;

        modalArtistName.textContent = artist.name;
        modalArtistId.value = artist.id;
        
        populateReleaseSelect(artist.id);
        
        actionTypeSelect.value = "";
        trackSelectWrapper.classList.add('hidden');
        actionLimitInfo.classList.add('hidden');
        confirmActionButton.disabled = false;
        confirmActionButton.textContent = 'Confirmar Ação';

        actionModal.classList.remove('hidden');
    }

    // Popula o select de Lançamentos (agora com Álbuns e Singles)
    function populateReleaseSelect(artistId) {
        // FILTRA A LISTA UNIFICADA 'db.releases'
        const artistReleases = db.releases.filter(r => r.artists.includes(artistId));
        releaseSelect.innerHTML = '<option value="" disabled selected>Selecione um lançamento...</option>';
        
        if (artistReleases.length === 0) {
            releaseSelect.innerHTML = '<option value="" disabled>Nenhum lançamento encontrado</option>';
            return;
        }

        artistReleases.sort((a,b) => a.name.localeCompare(b.name)).forEach(release => {
            const option = document.createElement('option');
            option.value = release.id;
            option.textContent = release.name;
            releaseSelect.appendChild(option);
        });
    }

    // Popula o select de Faixas (agora com faixas de 'Músicas')
    function populateTrackSelect(releaseId) {
        // FILTRA A LISTA 'db.tracks'
        const releaseTracks = db.tracks.filter(t => t.release === releaseId);
        trackSelect.innerHTML = '<option value="" disabled selected>Selecione uma faixa...</option>';
        
        if (releaseTracks.length === 0) {
            trackSelect.innerHTML = '<option value="" disabled>Nenhuma faixa encontrada</option>';
            trackSelectWrapper.classList.add('hidden');
            return;
        }

        releaseTracks.sort((a,b) => a.name.localeCompare(b.name)).forEach(track => {
            const option = document.createElement('option');
            option.value = track.id;
            option.textContent = track.name;
            trackSelect.appendChild(option); // Corrigido de releaseSelect para trackSelect
        });
        
        trackSelectWrapper.classList.remove('hidden');
    }

    // Atualiza a info de limite no modal
    function updateActionLimitInfo() {
        const artistId = modalArtistId.value;
        const actionType = actionTypeSelect.value;
        const artist = db.artists.find(a => a.id === artistId);
        
        if (!artist || !actionType || !ACTION_CONFIG[actionType]) {
            actionLimitInfo.classList.add('hidden');
            return;
        }
        
        const config = ACTION_CONFIG[actionType];
        const currentCount = artist[config.localCountKey]; // Pega a contagem local
        const limit = config.limit;

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


    // Função principal que executa a ação
    async function handleConfirmAction() {
        const artistId = modalArtistId.value;
        const trackId = trackSelect.value;
        const actionType = actionTypeSelect.value;

        if (!artistId || !trackId || !actionType) {
            alert("Por favor, selecione o lançamento, a faixa principal e o tipo de ação.");
            return;
        }

        const artist = db.artists.find(a => a.id === artistId);
        const track = db.tracks.find(t => t.id === trackId);
        const config = ACTION_CONFIG[actionType];

        if (!artist || !track || !config) {
            alert("Erro: Dados inválidos. Tente recarregar a página.");
            return;
        }

        const currentCount = artist[config.localCountKey];
        if (currentCount >= config.limit) {
            alert("Limite de ações para esta categoria atingido. Aguarde a próxima atualização manual.");
            return;
        }

        confirmActionButton.disabled = true;
        confirmActionButton.textContent = 'Processando...';

        // 1. Calcular streams aleatórios
        const streamsToAdd = getRandomInt(config.minStreams, config.maxStreams);
        
        // 2. Preparar dados para o PATCH
        const newCount = currentCount + 1;
        const newStreams = track.streams + streamsToAdd;

        const artistPatchBody = {
            fields: { [config.countField]: newCount } // Ex: "Promo_TV_Count": 1
        };
        
        const trackPatchBody = {
            fields: { "Streams": newStreams } // Ex: "Streams": 150000
        };

        // 3. Enviar os PATCHes para o Airtable
        try {
            const artistPatchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Artists/${artistId}`;
            // CORREÇÃO: URL da tabela de Músicas
            const trackPatchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Músicas/${trackId}`;
            
            const fetchOptions = {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
            };

            const [artistResponse, trackResponse] = await Promise.all([
                fetch(artistPatchUrl, { ...fetchOptions, body: JSON.stringify(artistPatchBody) }),
                fetch(trackPatchUrl, { ...fetchOptions, body: JSON.stringify(trackPatchBody) })
            ]);

            if (!artistResponse.ok || !trackResponse.ok) {
                const errorA = artistResponse.statusText;
                const errorT = trackResponse.statusText;
                throw new Error(`Falha ao salvar: Artista (${errorA}) / Faixa (${errorT})`);
            }

            // 4. Se sucesso, atualizar o DB local
            artist[config.localCountKey] = newCount;
            track.streams = newStreams;

            alert(`Ação "${actionTypeSelect.options[actionTypeSelect.selectedIndex].text}" registrada!\n\n+${streamsToAdd.toLocaleString('pt-BR')} streams para "${track.name}".\n\nUso: ${newCount}/${config.limit}`);
            
            actionModal.classList.add('hidden');

        } catch (err) {
            console.error('Erro ao tentar persistir no Airtable:', err);
            alert(`Erro ao salvar ação: ${err.message}`);
            confirmActionButton.disabled = false;
            confirmActionButton.textContent = 'Confirmar Ação';
        }
    }


    // --- 5. INICIALIZAÇÃO ---

    // Listeners do Modal
    releaseSelect.addEventListener('change', () => {
        if (releaseSelect.value) {
            populateTrackSelect(releaseSelect.value);
        } else {
            trackSelectWrapper.classList.add('hidden');
        }
    });

    actionTypeSelect.addEventListener('change', updateActionLimitInfo);
    // Adicionado para checar o limite assim que a faixa é selecionada
    trackSelect.addEventListener('change', updateActionLimitInfo); 

    cancelActionButton.addEventListener('click', () => {
        actionModal.classList.add('hidden');
    });

    confirmActionButton.addEventListener('click', handleConfirmAction);


    // Carga inicial
    await loadRequiredData();
    if (db.players.length > 0 && db.artists.length > 0) {
        initializeLogin();
    } else {
         artistActionsList.innerHTML = "<p>Não foi possível carregar os dados necessários. Verifique o console.</p>";
    }
});
