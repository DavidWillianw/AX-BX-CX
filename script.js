document.addEventListener('DOMContentLoaded', async () => {

    // --- VARIÁVEIS GLOBAIS ---
    let db = { artists: [], albums: [], singles: [], songs: [], players: [] };
    let currentPlayer = null;

    // IDs da base
    const AIRTABLE_BASE_ID = 'appG5NOoblUmtSMVI';
    const AIRTABLE_API_KEY = 'pat5T28kjmJ4t6TQG.69bf34509e687fff6a3f76bd52e64518d6c92be8b1ee0a53bcc9f50fedcb5c70';

    // --- ELEMENTOS DO DOM ---
    const loginPrompt = document.getElementById('loginPrompt');
    const loggedInInfo = document.getElementById('loggedInInfo');
    const playerSelect = document.getElementById('playerSelect');
    const loginButton = document.getElementById('loginButton');
    const logoutButton = document.getElementById('logoutButton');
    const actionsWrapper = document.getElementById('actionsWrapper');
    const artistActionsList = document.getElementById('artistActionsList');

    // Elementos do Modal
    const actionModal = document.getElementById('actionModal');
    const modalArtistName = document.getElementById('modalArtistName');
    const modalArtistIdInput = document.getElementById('modalArtistId');
    const releaseSelect = document.getElementById('releaseSelect');
    const trackSelectWrapper = document.getElementById('trackSelectWrapper');
    const trackSelect = document.getElementById('trackSelect');
    const actionTypeSelect = document.getElementById('actionTypeSelect');
    const remixCountInfo = document.getElementById('remixCountInfo');
    const currentRemixCountSpan = document.getElementById('currentRemixCount');
    const confirmActionButton = document.getElementById('confirmActionButton');
    const cancelActionButton = document.getElementById('cancelActionButton');
    const actionCooldownInfo = document.getElementById('actionCooldownInfo');


    // Chaves localStorage
    const PLAYER_ID_KEY = 'spotifyRpgActions_playerId';
    const COOLDOWNS_KEY = 'spotifyRpgActions_cooldowns';

    // --- 1. CARREGAMENTO DE DADOS ---

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
            if (data.records) allRecords.push(...data.records);
            offset = data.offset;
        } while (offset);
        return { records: allRecords };
    }

    async function loadRequiredData() {
        const artistsURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Artists`;
        const albumsURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Álbuns`;
        const musicasURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Músicas`;
        const singlesURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Singles%20e%20EPs`;
        const playersURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Jogadores`;
        const fetchOptions = { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } };

        console.log("Carregando todos os dados necessários (com paginação)...");
        try {
            const [artistsData, albumsData, musicasData, singlesData, playersData] = await Promise.all([
                fetchAllAirtablePages(artistsURL, fetchOptions),
                fetchAllAirtablePages(albumsURL, fetchOptions),
                fetchAllAirtablePages(musicasURL, fetchOptions),
                fetchAllAirtablePages(singlesURL, fetchOptions),
                fetchAllAirtablePages(playersURL, fetchOptions)
            ]);

            if (!artistsData || !albumsData || !musicasData || !singlesData || !playersData) {
                 throw new Error('Falha ao carregar dados Airtable (paginação).');
            }

            // Processa Artistas
            db.artists = artistsData.records.map(record => ({
                id: record.id,
                name: record.fields.Name || 'Nome Indisponível',
                RPGPoints: record.fields.RPGPoints || 0,
                // ==========================================
                // === VERIFIQUE ESTE NOME NO AIRTABLE ===
                // ==========================================
                LastActive: record.fields['LastActive'] || null // <<< SUBSTITUA 'LastActive' SE NECESSÁRIO
            }));

             // Processa Músicas
             db.songs = musicasData.records.map(record => ({
                id: record.id,
                title: record.fields['Nome da Faixa'] || 'Faixa Sem Título',
                artistIds: record.fields['Artista'] || [],
                // ========================================================
                // === VERIFIQUE OS NOMES DESTES CAMPOS LINK NO AIRTABLE ===
                // ========================================================
                albumId: (record.fields['Álbuns'] ? record.fields['Álbuns'][0] : null) || (record.fields['Singles e EPs'] ? record.fields['Singles e EPs'][0] : null), // <<< CONFIRME 'Álbuns' e 'Singles e EPs'
                // ========================================================
                // === CRIE ESTE CAMPO NUMÉRICO NO AIRTABLE ("Músicas") ===
                // ========================================================
                remixCount: record.fields['Remix Count'] || 0 // <<< CONFIRME 'Remix Count'
            }));

            // Processa Álbuns e Singles/EPs
             const processReleases = (records, isAlbum) => records.map(record => {
                const fields = record.fields;
                const releaseId = record.id;
                // Encontra as musicas JÁ PROCESSADAS para este release
                const tracks = db.songs.filter(s => s.albumId === releaseId)
                                       .sort((a,b) => (a.trackNumber || 0) - (b.trackNumber || 0)); // Ordena por número da faixa
                return {
                     id: releaseId,
                     title: fields[isAlbum ? 'Nome do Álbum' : 'Nome do Single/EP'] || 'Título Indisponível',
                     artistId: (fields['Artista'] || [])[0] || null,
                     releaseDate: fields['Data de Lançamento'] || '1970-01-01',
                     isAlbum: isAlbum,
                     tracks: tracks // Linka as músicas processadas
                };
             });

            db.albums = processReleases(albumsData.records, true);
            db.singles = processReleases(singlesData.records, false);

            // Processa Jogadores
            db.players = playersData.records.map(record => ({
                id: record.id,
                name: record.fields.Nome,
                artists: record.fields.Artistas || []
            }));

            console.log(`Dados carregados: ${db.artists.length} artistas, ${db.albums.length} álbuns, ${db.singles.length} singles, ${db.songs.length} músicas, ${db.players.length} jogadores.`);

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            artistActionsList.innerHTML = `<p>Erro ao carregar dados do Airtable.</p>`;
            // Opcional: Desabilitar funcionalidade de login se dados falharem
             loginButton.disabled = true;
             playerSelect.disabled = true;
        }
    }

    // --- 2. LÓGICA DE LOGIN ---
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
        closeActionModal(); // Fecha o modal se estiver aberto
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
        // Tenta logar apenas se houver jogadores carregados
        if (storedPlayerId && db.players.length > 0) {
            loginPlayer(storedPlayerId);
        } else if (db.players.length > 0) { // Só mostra msg de login se houver jogadores
             artistActionsList.innerHTML = "<p>Faça login para ver as ações.</p>";
        }
    }

    // --- 3. LÓGICA DE AÇÕES RPG ---

    function loadCooldownsFromStorage() {
        const savedCooldowns = localStorage.getItem(COOLDOWNS_KEY);
        try {
            const parsed = savedCooldowns ? JSON.parse(savedCooldowns) : {};
            // Limpa entradas inválidas ou expiradas (extra check)
            const now = Date.now();
            const validCooldowns = {};
            for (const key in parsed) {
                if (typeof parsed[key] === 'number' && parsed[key] > now) {
                    validCooldowns[key] = parsed[key];
                }
            }
            return validCooldowns;
        } catch (e) {
            console.error("Erro ao carregar cooldowns do localStorage:", e);
            localStorage.removeItem(COOLDOWNS_KEY); // Limpa se estiver corrompido
            return {};
        }
    }


    function saveCooldownsToStorage(cooldowns) {
        const now = Date.now();
        const cleanedCooldowns = {};
        for (const key in cooldowns) {
            if (cooldowns[key] > now) {
                cleanedCooldowns[key] = cooldowns[key];
            }
        }
        try {
            localStorage.setItem(COOLDOWNS_KEY, JSON.stringify(cleanedCooldowns));
        } catch (e) {
            console.error("Erro ao salvar cooldowns no localStorage:", e);
        }
    }


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
            <div class="artist-action-item" data-artist-id="${artist.id}" role="button" tabindex="0" aria-label="Ações para ${artist.name}">
                <span class="artist-name">${artist.name}</span>
                <span class="open-actions-icon"><i class="fas fa-chevron-right"></i></span>
            </div>
        `).join('');

        artistActionsList.querySelectorAll('.artist-action-item').forEach(item => {
            item.addEventListener('click', () => openActionModal(item.dataset.artistId));
            // Adiciona suporte a teclado (Enter)
             item.addEventListener('keydown', (e) => {
                 if (e.key === 'Enter') openActionModal(item.dataset.artistId);
             });
        });
    }

    function openActionModal(artistId) {
        const artist = db.artists.find(a => a.id === artistId);
        if (!artist) return;

        modalArtistName.textContent = `Ações para ${artist.name}`;
        modalArtistIdInput.value = artistId;
        actionTypeSelect.value = "";
        trackSelectWrapper.classList.add('hidden');
        remixCountInfo.classList.add('hidden');
        actionCooldownInfo.textContent = '';
        confirmActionButton.disabled = true; // Desabilita confirmação até selecionar ação

        const artistReleases = [...db.albums, ...db.singles]
            .filter(r => r.artistId === artistId)
            .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

        releaseSelect.innerHTML = '<option value="" disabled selected>Selecione um lançamento...</option>';
        if (artistReleases.length === 0) {
            releaseSelect.innerHTML += '<option value="" disabled>Nenhum lançamento encontrado</option>';
        } else {
            artistReleases.forEach(release => {
                // Guarda se é album e o ID no data attribute
                releaseSelect.innerHTML += `<option value="${release.id}" data-is-album="${release.isAlbum}">${release.title} (${new Date(release.releaseDate).getFullYear()})</option>`;
            });
        }
        releaseSelect.value = ""; // Garante que nada esteja pré-selecionado

        actionModal.classList.remove('hidden');
    }

    function closeActionModal() {
        actionModal.classList.add('hidden');
    }

    function populateTrackSelect() {
        const selectedReleaseOption = releaseSelect.options[releaseSelect.selectedIndex];
        if (!selectedReleaseOption || !selectedReleaseOption.value) { // Verifica se algo foi selecionado
             trackSelectWrapper.classList.add('hidden');
             remixCountInfo.classList.add('hidden');
             showActionCooldown(); // Atualiza cooldown mesmo sem release
             return;
        }

        const releaseId = selectedReleaseOption.value;
        const isAlbum = selectedReleaseOption.dataset.isAlbum === 'true';
        const actionType = actionTypeSelect.value;

        // Ações que PRECISAM de seleção de faixa (se for Álbum/EP)
        const requiresTrackForAlbum = ['promo_tv', 'promo_radio', 'promo_commercial', 'remix', 'mv'];

        // Mostra o select de faixas?
        const showTrackSelect = isAlbum && requiresTrackForAlbum.includes(actionType);

        if (showTrackSelect) {
            const release = db.albums.find(a => a.id === releaseId) || db.singles.find(s => s.id === releaseId);
            if (release && release.tracks && release.tracks.length > 0) {
                trackSelect.innerHTML = '<option value="" disabled selected>Escolha a faixa...</option>';
                // Ordena faixas por número antes de popular
                release.tracks.sort((a,b) => (a.trackNumber || 0) - (b.trackNumber || 0)).forEach(track => {
                    trackSelect.innerHTML += `<option value="${track.id}">${track.title}</option>`;
                });
                trackSelectWrapper.classList.remove('hidden');
            } else {
                trackSelect.innerHTML = '<option value="" disabled>Nenhuma faixa encontrada</option>';
                 trackSelectWrapper.classList.remove('hidden');
            }
        } else {
            trackSelectWrapper.classList.add('hidden');
        }

        // Mostra info de Remix? (Independente de ser album ou single, se a ação for remix)
        if (actionType === 'remix') {
             showRemixCount();
        } else {
             remixCountInfo.classList.add('hidden');
        }

        showActionCooldown(); // Atualiza o cooldown para a ação selecionada
    }


     function showActionCooldown() {
        const artistId = modalArtistIdInput.value;
        const actionKey = actionTypeSelect.value;
        actionCooldownInfo.textContent = '';
        confirmActionButton.disabled = true; // Desabilita por padrão

        if (!artistId || !actionKey || !releaseSelect.value) return; // Precisa ter release selecionado também

        const timeLeft = getCooldownTimeLeft(artistId, actionKey);

        if (timeLeft > 0) {
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            actionCooldownInfo.textContent = `Em cooldown: (${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')})`;
            // Mantém desabilitado
        } else {
             // Habilita SOMENTE se não estiver em cooldown E outras condições forem válidas (como limite de remix)
             const isRemixAction = actionKey === 'remix';
             const remixLimitReached = isRemixAction && !remixCountInfo.classList.contains('hidden') && parseInt(currentRemixCountSpan.textContent) >= 5;

             if (!remixLimitReached) {
                confirmActionButton.disabled = false;
             } else if (isRemixAction) {
                // Se o limite de remix foi atingido, mostra msg e mantém desabilitado
                actionCooldownInfo.textContent = 'Limite de remixes atingido para esta faixa.';
             }
        }
     }

     function showRemixCount() {
         const selectedReleaseOption = releaseSelect.options[releaseSelect.selectedIndex];
         if (!selectedReleaseOption || !selectedReleaseOption.value) {
             remixCountInfo.classList.add('hidden');
             return;
         }
         const releaseId = selectedReleaseOption.value;
         const isAlbum = selectedReleaseOption.dataset.isAlbum === 'true';
         let targetSongId = null;

         if (isAlbum) {
             targetSongId = trackSelect.value; // Pega a faixa selecionada no álbum
         } else {
             // Se for single, encontra a primeira faixa
             const release = db.singles.find(s => s.id === releaseId);
             if (release && release.tracks && release.tracks.length > 0) {
                 targetSongId = release.tracks[0].id;
             }
         }

         if (targetSongId) {
             const song = db.songs.find(s => s.id === targetSongId);
             const count = song ? song.remixCount : 0;
             currentRemixCountSpan.textContent = count;
             remixCountInfo.classList.remove('hidden');

             // Atualiza estado do botão e cooldown baseado na contagem
            showActionCooldown(); // Reavalia o botão e msg de cooldown/limite
         } else {
             remixCountInfo.classList.add('hidden');
             // Se não tem faixa alvo (ex: selecionou album mas não a faixa ainda),
             // desabilita o botão de confirmação para remix
             if (actionTypeSelect.value === 'remix') {
                 confirmActionButton.disabled = true;
                 actionCooldownInfo.textContent = 'Selecione a faixa para ver o limite de remix.';
             }
         }
     }


    async function handleConfirmAction() {
        const artistId = modalArtistIdInput.value;
        const releaseId = releaseSelect.value;
        const action = actionTypeSelect.value;
        const selectedReleaseOption = releaseSelect.options[releaseSelect.selectedIndex];
        const isAlbum = selectedReleaseOption?.dataset.isAlbum === 'true'; // Usa optional chaining

        let targetSongId = null; // ID da música que será afetada (para Remix/MV ou faixa principal)

         // Verifica campos obrigatórios
         if (!artistId || !releaseId || !action) {
            alert("Por favor, selecione artista, lançamento e tipo de ação.");
            return;
        }

        // Determina a música alvo
        const requiresTrackSelection = ['promo_tv', 'promo_radio', 'promo_commercial', 'remix', 'mv'];
        if (isAlbum && requiresTrackSelection.includes(action)) {
             targetSongId = trackSelect.value;
             if (!targetSongId) {
                 alert("Por favor, selecione a faixa principal.");
                 return;
             }
        } else if (!isAlbum) { // Se for single, pega a ID da primeira faixa automaticamente
             const release = db.singles.find(s => s.id === releaseId);
             if (release && release.tracks && release.tracks.length > 0) {
                 targetSongId = release.tracks[0].id;
                 // Para ações que não precisam de faixa específica em single (nenhuma no momento), targetSongId pode ficar null.
                 // Mas Remix/MV precisam.
                 if (!targetSongId && (action === 'remix' || action === 'mv')) {
                      alert("Não foi possível encontrar a faixa do single.");
                      return;
                 }
             } else if (action === 'remix' || action === 'mv') { // Single sem faixas? Erro.
                  alert("Erro: Single selecionado não possui faixas associadas.");
                  return;
             }
        }
        // Se targetSongId ainda for null aqui para remix ou mv, algo deu errado
         if ((action === 'remix' || action === 'mv') && !targetSongId) {
              alert("Erro inesperado: Não foi possível determinar a faixa alvo para Remix/MV.");
              return;
         }


        confirmActionButton.disabled = true;
        confirmActionButton.textContent = 'Executando...';

        const success = await performRPGAction(action, artistId, targetSongId); // Passa songId para remix/mv

        confirmActionButton.textContent = 'Confirmar Ação'; // Volta o texto padrão

        if (success) {
            closeActionModal();
            // Opcional: Mostrar uma notificação de sucesso
            alert(`Ação "${actionTypeSelect.options[actionTypeSelect.selectedIndex].text}" executada com sucesso!`);
        } else {
             // Mantém modal aberto, atualiza estado visual (cooldown/limite)
             showActionCooldown();
             if (action === 'remix') showRemixCount();
        }
    }


    function getCooldownSecondsForAction(action) {
        const cooldownMapSec = {
            promo_tv: 60 * 60 * 4,
            promo_radio: 60 * 60 * 2,
            promo_commercial: 60 * 60 * 6,
            remix: 60 * 60 * 24,
            mv: 60 * 60 * 12,
        };
        return cooldownMapSec[action] || 60 * 5;
    }

    // Aceita targetSongId opcional
    async function performRPGAction(action, artistId, targetSongId = null) {
        const actionPointsMap = {
            promo_tv: 100, promo_radio: 50, promo_commercial: 150,
            remix: 80, mv: 120
        };
        const points = actionPointsMap[action] || 0;
        const cooldownSec = getCooldownSecondsForAction(action);
        const REMIX_LIMIT = 5;

        if (points === 0) {
            console.warn(`Ação '${action}' não configurada ou sem pontos.`);
            alert(`Ação '${action}' não reconhecida.`);
            return false;
        }

        const timeLeft = getCooldownTimeLeft(artistId, action);
        if (timeLeft > 0) {
            console.log(`Ação '${action}' para ${artistId} em cooldown.`);
            return false;
        }

        let currentRemixCount = 0;
        if (action === 'remix') {
            if (!targetSongId) {
                 alert("Erro: ID da música alvo não encontrado para o remix.");
                 console.error("performRPGAction: targetSongId é null para ação remix.");
                 return false;
            }
            const song = db.songs.find(s => s.id === targetSongId);
            currentRemixCount = song ? song.remixCount : 0;
            if (currentRemixCount >= REMIX_LIMIT) {
                alert("Limite de remixes atingido para esta faixa.");
                console.log(`Limite de remixes atingido para ${targetSongId} (Artista: ${artistId})`);
                return false;
            }
        }

        const cooldowns = loadCooldownsFromStorage();
        const endTime = Date.now() + (cooldownSec * 1000);
        cooldowns[`${artistId}_${action}`] = endTime;
        saveCooldownsToStorage(cooldowns);

        const artistEntryLocal = db.artists.find(a => a.id === artistId);
        const currentPoints = artistEntryLocal ? artistEntryLocal.RPGPoints : 0;
        const newPoints = currentPoints + points;
        const newLastActive = new Date().toISOString();

        console.log(`Aplicando ${points} pts para ${artistId} via ação '${action}'. Novo total (tentativa): ${newPoints}`);

        try {
            // 1. Atualiza Artista
            // ==========================================
            // === VERIFIQUE ESTE NOME NO AIRTABLE ===
            // ==========================================
            const artistLastActiveField = 'LastActive'; // <<< CONFIRME ESTE NOME

            const artistPatchBody = { fields: { 'RPGPoints': newPoints, [artistLastActiveField]: newLastActive } };
            const artistResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Artists/${artistId}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(artistPatchBody)
            });
            if (!artistResponse.ok) {
                const errorData = await artistResponse.json();
                throw new Error(`Falha ao ATUALIZAR ARTISTA no Airtable: ${JSON.stringify(errorData.error)}`);
            }
            console.log(`Artista ${artistId} atualizado no Airtable.`);

             if(artistEntryLocal) {
                 artistEntryLocal.RPGPoints = newPoints;
                 artistEntryLocal.LastActive = newLastActive; // Atualiza o local também
             }

            // 2. Atualiza Contagem de Remix (se aplicável)
            if (action === 'remix' && targetSongId) {
                 const newRemixCount = currentRemixCount + 1;
                 // ==========================================
                 // === VERIFIQUE ESTE NOME NO AIRTABLE ===
                 // ==========================================
                 const remixCountField = 'Remix Count'; // <<< CONFIRME ESTE NOME
                 const songPatchBody = { fields: { [remixCountField]: newRemixCount } };

                 const songResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Músicas/${targetSongId}`, {
                     method: 'PATCH',
                     headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
                     body: JSON.stringify(songPatchBody)
                 });
                 if (!songResponse.ok) {
                    const errorData = await songResponse.json();
                    console.error(`Falha ao ATUALIZAR CONTAGEM DE REMIX para ${targetSongId} no Airtable: ${JSON.stringify(errorData.error)}`);
                    alert("Ação de pontos aplicada, mas houve um erro ao atualizar a contagem de remixes.");
                 } else {
                     console.log(`Contagem de remix para ${targetSongId} atualizada para ${newRemixCount}.`);
                     const songEntryLocal = db.songs.find(s => s.id === targetSongId);
                     if (songEntryLocal) {
                         songEntryLocal.remixCount = newRemixCount;
                     }
                 }
            }
            // 3. Adicionar lógica para MV se necessário (ex: marcar um campo booleano 'MV Lançado?')

            return true; // Sucesso

        } catch (err) {
            console.error('Erro ao tentar persistir no Airtable:', err);
            alert(`Erro ao salvar ação: ${err.message}`);

            // Rollback do cooldown local
            const currentCooldowns = loadCooldownsFromStorage();
            delete currentCooldowns[`${artistId}_${action}`];
            saveCooldownsToStorage(currentCooldowns);

            return false; // Falha
        }
    }


    // --- 5. INICIALIZAÇÃO GERAL ---
    await loadRequiredData();

    if (db.players.length > 0 && db.artists.length > 0) {
        initializeLogin();
         // Listeners do Modal (só adiciona se o modal existe)
         if (actionModal) {
            releaseSelect.addEventListener('change', populateTrackSelect);
            actionTypeSelect.addEventListener('change', populateTrackSelect);
            trackSelect.addEventListener('change', showRemixCount); // Se a ação for remix, mostra contagem ao mudar faixa
            confirmActionButton.addEventListener('click', handleConfirmAction);
            cancelActionButton.addEventListener('click', closeActionModal);
            // Fecha modal clicando fora
            actionModal.addEventListener('click', (e) => {
                 if (e.target === actionModal) { // Clicou no overlay escuro?
                    closeActionModal();
                 }
            });
         } else {
             console.error("Modal de Ação não encontrado no HTML!");
         }
    } else {
         artistActionsList.innerHTML = "<p>Não foi possível carregar os dados necessários. Verifique o console.</p>";
         // Desabilita login se dados falharam
          playerSelect.disabled = true;
          loginButton.disabled = true;
    }

});
