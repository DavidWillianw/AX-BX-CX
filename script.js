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
    
    // playerSelect NÃO será usado para o login principal, mas é pego se necessário
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
    const PLAYER_NAME_KEY = 'spotifyRpgActions_playerName'; // Mudado para nome para persistência

    // --- Configuração das Ações ---
    // (minStreams/maxStreams definem o ganho da FAIXA PRINCIPAL)
    const ACTION_CONFIG = {
        'promo_tv':         { limit: 10, countField: 'Promo_TV_Count',         localCountKey: 'promo_tv_count',         minStreams: 50000, maxStreams: 100000, isPromotion: true, bonusLocalKey: 'promo_tv_bonus_claimed',         bonusField: 'Promo_TV_Bonus_Claimed' },
        'promo_radio':      { limit: 10, countField: 'Promo_Radio_Count',      localCountKey: 'promo_radio_count',      minStreams: 30000, maxStreams: 70000,  isPromotion: true, bonusLocalKey: 'promo_radio_bonus_claimed',      bonusField: 'Promo_Radio_Bonus_Claimed' },
        'promo_commercial': { limit: 5,  countField: 'Promo_Commercial_Count', localCountKey: 'promo_commercial_count', minStreams: 80000, maxStreams: 150000, isPromotion: true, bonusLocalKey: 'promo_commercial_bonus_claimed', bonusField: 'Promo_Commercial_Bonus_Claimed' },
        'promo_internet':   { limit: 15, countField: 'Promo_Internet_Count',   localCountKey: 'promo_internet_count',   minStreams: 15000, maxStreams: 40000,  isPromotion: true, bonusLocalKey: 'promo_internet_bonus_claimed',   bonusField: 'Promo_Internet_Bonus_Claimed' },
        'remix':            { limit: 5,  countField: 'Remix_Count',            localCountKey: 'remix_count',            minStreams: 10000, maxStreams: 50000,  isPromotion: false, bonusLocalKey: 'remix_bonus_claimed',            bonusField: 'Remix_Bonus_Claimed' }, // Remix não é promoção, não distribui
        'mv':               { limit: 3,  countField: 'MV_Count',               localCountKey: 'mv_count',               minStreams: 60000, maxStreams: 120000, isPromotion: false, bonusLocalKey: 'mv_bonus_claimed',               bonusField: 'MV_Bonus_Claimed' }  // MV não é promoção, não distribui
    };

    // --- Configuração de Punições ---
    const PUNISHMENT_CONFIG = [
        { message: "🚫 Opa! Você teve uma fala polêmica na tv e foi cancelada!", value: -12000 },
        { message: "📉 Seu MV foi acusado de plágio! Que situação...", value: -20000 },
        { message: "🔥 Vazou uma demo antiga sua e... não é boa.", value: -5000 },
        { message: "😲 Um influencer famoso criticou sua música.", value: -15000 },
        { message: "🤷‍♂️ A promoção não deu certo e foi ignorada pelo público.", value: -1000 }, // Punição leve
        { message: "💔 Um membro do grupo se envolveu em um escândalo de namoro!", value: -25000 }
    ];

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

            if (!artistsData || !playersData || !albumsData || !singlesData || !tracksData) {
                throw new Error('Falha ao carregar um ou mais conjuntos de dados essenciais.');
            }

            db.artists = artistsData.records.map(r => {
                const artist = {
                    id: r.id,
                    name: r.fields['Name'] || '?',
                    RPGPoints: r.fields.RPGPoints || 0,
                    LastActive: r.fields.LastActive || null,
                };
                for (const key in ACTION_CONFIG) {
                    const config = ACTION_CONFIG[key];
                    artist[config.localCountKey] = r.fields[config.countField] || 0;
                    artist[config.bonusLocalKey] = r.fields[config.bonusField] || false;
                }
                return artist;
            });
            
            db.players = playersData.records.map(r => ({
                id: r.id,
                name: r.fields['Nome'],
                password: r.fields.Senha, // <-- BUSCA A SENHA
                artists: r.fields['Artistas'] || []
            }));

            const allReleases = [];
            albumsData.records.forEach(r => allReleases.push({
                id: r.id,
                name: r.fields['Nome do Álbum'] || 'Álbum?',
                artists: r.fields['Artista'] || [] // Artista principal ou Dueto
            }));
            singlesData.records.forEach(r => allReleases.push({
                id: r.id,
                name: r.fields['Nome do Single/EP'] || 'Single?',
                artists: r.fields['Artista'] || [] // Artista principal ou Dueto
            }));
            db.releases = allReleases;

            db.tracks = tracksData.records.map(r => {
                const releaseId = (r.fields['Álbuns']?.[0]) || (r.fields['Singles e EPs']?.[0]) || null;
                return {
                    id: r.id,
                    name: r.fields['Nome da Faixa'] || 'Faixa?',
                    release: releaseId,
                    streams: r.fields.Streams || 0,
                    totalStreams: r.fields['Streams Totais'] || 0,
                    trackType: r.fields['Tipo de Faixa'] || 'B-side',
                    artistIds: r.fields['Artista'] || [], // Lista de TODOS os artistas na faixa
                    collabType: r.fields['Tipo de Colaboração'] || null // "Feat." ou "Dueto/Grupo"
                };
            });

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
            .filter(Boolean) 
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

        populateReleaseSelect(artist.id); 
        
        actionTypeSelect.value = ""; 
        trackSelect.innerHTML = '<option value="" disabled selected>Selecione um lançamento primeiro</option>'; 
        trackSelectWrapper.classList.add('hidden'); 
        actionLimitInfo.classList.add('hidden'); 
        confirmActionButton.disabled = true; 
        confirmActionButton.textContent = 'Confirmar Ação';
        actionModal.classList.remove('hidden');
    }

    function populateReleaseSelect(artistId) {
        const mainArtistReleases = db.releases.filter(r => r.artists && r.artists.includes(artistId));
        const mainArtistReleaseIds = new Set(mainArtistReleases.map(r => r.id));

        const featuredReleaseIds = new Set();
        const actionableTypes = ['Title Track', 'Pre-release'];
        
        db.tracks.forEach(track => {
            if (track.release && 
                track.artistIds.includes(artistId) && 
                actionableTypes.includes(track.trackType)) {
                
                featuredReleaseIds.add(track.release);
            }
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
                o.textContent = r.name;
                releaseSelect.appendChild(o);
            });
    }

    function populateTrackSelect(releaseId, artistId) {
        
        const actionableTypes = ['Title Track', 'Pre-release'];
        
        const releaseActionableTracks = db.tracks.filter(t => 
            t.release === releaseId && 
            actionableTypes.includes(t.trackType) &&
            t.artistIds.includes(artistId) // <-- O artista LOGADO tem que estar na faixa
        );

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
            confirmActionButton.disabled = true;
            return;
        }
        
        const config = ACTION_CONFIG[actionType];
        
        if (!trackId) {
            actionLimitInfo.classList.add('hidden'); // Esconde se não há faixa
            confirmActionButton.disabled = true;
            confirmActionButton.textContent = 'Selecione a Faixa';
            return;
        }

        const track = db.tracks.find(t => t.id === trackId);
        if (!track) { // Segurança, caso a faixa suma
             actionLimitInfo.classList.add('hidden');
             confirmActionButton.disabled = true;
             return;
        }

        const isMain = track.artistIds[0] === artistId || track.collabType === 'Dueto/Grupo';
        const limit = isMain ? config.limit : 3; 
        
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
    // ========== JS ALTERADO =========
    // ==================================
    // Modificado handleConfirmAction para randomizar ganhos de B-side/Minor
    async function handleConfirmAction() {
        const artistId = modalArtistId.value;
        const trackId = trackSelect.value; 
        const actionType = actionTypeSelect.value;

        if (!artistId || !trackId || !actionType) { alert("Selecione artista, lançamento, faixa e tipo de ação."); return; }
        const artist = db.artists.find(a => a.id === artistId);
        const selectedTrack = db.tracks.find(t => t.id === trackId);
        const config = ACTION_CONFIG[actionType];
        if (!artist || !selectedTrack || !config) { alert("Erro: Dados inválidos (artista, faixa ou config)."); return; }

        const isMain = selectedTrack.artistIds[0] === artistId || selectedTrack.collabType === 'Dueto/Grupo';
        const limit = isMain ? config.limit : 3;
        const currentCount = artist[config.localCountKey] || 0;
        
        if (currentCount >= limit) {
            alert("Limite de uso para esta ação já foi atingido."); 
            return;
        }

        confirmActionButton.disabled = true; confirmActionButton.textContent = 'Processando...';

        let streamsToAdd = 0; // Ganho da faixa principal
        let eventMessage = null; 
        const bonusLocalKey = config.bonusLocalKey;
        const bonusField = config.bonusField;
        const hasClaimedBonus = artist[bonusLocalKey] || false;
        
        const bonusCheck = Math.random();
        const punishmentCheck = Math.random();
        const newCount = currentCount + 1;
        const artistPatchBody = { fields: { [config.countField]: newCount } }; 

        // Calcula o ganho da faixa principal
        if (!hasClaimedBonus && bonusCheck < 0.01) { // 1% chance de Jackpot
            streamsToAdd = 200000;
            eventMessage = "🎉 JACKPOT! Você viralizou inesperadamente e ganhou +200k streams! (Bônus de categoria único)";
            artistPatchBody.fields[bonusField] = true; 
            artist[bonusLocalKey] = true; 
        } else if (punishmentCheck < 0.10) { // 10% chance de Punição
            const punishment = getRandomPunishment();
            streamsToAdd = punishment.value;
            eventMessage = punishment.message;
        } else { // Ganho normal
            streamsToAdd = getRandomInt(config.minStreams, config.maxStreams);
        }
        
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

        // --- LÓGICA DE DISTRIBUIÇÃO B-SIDE/MINOR (MODIFICADA) ---
        let otherTracksInRelease = [];
        let totalDistributedGain = 0; // Para somar o ganho total distribuído

        // Só distribui se for PROMOÇÃO, ganho POSITIVO e artista for MAIN/DUETO
        if (config.isPromotion && streamsToAdd > 0 && isMain) {
            const releaseId = selectedTrack.release;
            if (releaseId) {
                otherTracksInRelease = db.tracks.filter(t => t.release === releaseId && t.id !== selectedTrack.id);

                const bSideTypes = ['B-side'];
                const preReleaseTypes = ['Pre-release']; // Pre-releases ainda recebem fixo
                const minorTypes = ['Intro', 'Outro', 'Skit', 'Interlude'];

                otherTracksInRelease.forEach(otherTrack => {
                    let gain = 0;
                    let percentageUsed = 0; // Para mostrar na mensagem

                    // B-sides e Minor agora ganham entre 0% e 30%
                    if (bSideTypes.includes(otherTrack.trackType) || minorTypes.includes(otherTrack.trackType)) {
                        const randomPercentage = Math.random() * 0.30; // Gera um número entre 0.0 e 0.3
                        percentageUsed = randomPercentage;
                        gain = Math.floor(streamsToAdd * randomPercentage); 
                    } 
                    // Pre-releases continuam ganhando 95% fixo
                    else if (preReleaseTypes.includes(otherTrack.trackType)) {
                        percentageUsed = 0.95; // Fixo
                        gain = Math.floor(streamsToAdd * percentageUsed); 
                    }

                    if (gain > 0) {
                        totalDistributedGain += gain; // Soma ao total distribuído
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
                            gain: gain,
                            percentage: percentageUsed // Guarda a porcentagem usada
                        });
                    }
                }); 
            } else {
                console.warn(`Faixa ${selectedTrack.name} (ID: ${selectedTrack.id}) não está associada a um lançamento. Distribuição ignorada.`);
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

            // Atualiza DB local
            artist[config.localCountKey] = newCount;
            trackUpdatesLocal.forEach(update => {
                const trackInDb = db.tracks.find(t => t.id === update.id);
                if (trackInDb) {
                    trackInDb.streams = update.newStreams;
                    trackInDb.totalStreams = update.newTotalStreams;
                }
            });

            // Monta a mensagem de sucesso
            let alertMessage = `Ação "${actionTypeSelect.options[actionTypeSelect.selectedIndex].text}" registrada!\n\n`;
            if (eventMessage) {
                alertMessage += `${eventMessage}\n\n`;
            }

            if (streamsToAdd >= 0) {
                 alertMessage += `📈 Ganho Principal: +${streamsToAdd.toLocaleString('pt-BR')} streams para "${selectedTrack.name}".\n\n`;
            } else {
                 alertMessage += `📉 Perda Principal: ${streamsToAdd.toLocaleString('pt-BR')} streams para "${selectedTrack.name}".\n\n`;
            }

            // Mostra o total distribuído se houver
            if (totalDistributedGain > 0) {
                alertMessage += `✨ +${totalDistributedGain.toLocaleString('pt-BR')} streams distribuídos para outras faixas do lançamento.\n`
                // Opcional: Detalhar o ganho de cada faixa (pode ficar longo)
                // trackUpdatesLocal.forEach(upd => {
                //     if (upd.gain > 0 && upd.id !== selectedTrack.id) {
                //         const t = db.tracks.find(tr => tr.id === upd.id);
                //         alertMessage += `   +${upd.gain.toLocaleString('pt-BR')} para "${t?.name || '?'}" (${(upd.percentage * 100).toFixed(1)}%)\n`;
                //     }
                // });
                alertMessage += "\n";
            }
            
            alertMessage += `📊 Uso da Ação: ${newCount}/${limit}`;
            
            if (!isMain) {
                alertMessage += ` (Limite de 3 usos para participações "Feat.")`;
            }
            
            alert(alertMessage);
            actionModal.classList.add('hidden');

        } catch (err) {
            console.error('Erro ao tentar persistir no Airtable:', err);
            alert(`Erro ao salvar ação: ${err.message}`);
        } finally {
            confirmActionButton.disabled = false; 
            confirmActionButton.textContent = 'Confirmar Ação';
            updateActionLimitInfo(); // Reavalia o estado
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
            trackSelect.innerHTML = '<option value="" disabled selected>Selecione um lançamento</option>';
            updateActionLimitInfo();
        }
    });
    actionTypeSelect.addEventListener('change', updateActionLimitInfo);
    trackSelect.addEventListener('change', updateActionLimitInfo); 
    cancelActionButton.addEventListener('click', () => { actionModal.classList.add('hidden'); });
    confirmActionButton.addEventListener('click', handleConfirmAction);


    // Carga inicial
    await loadRequiredData();
    if (db.players && db.artists) {
        initializeLogin();
    } else {
        console.error("Não foi possível inicializar o login devido a erro no carregamento de dados.");
        if (artistActionsList) artistActionsList.innerHTML = "<p>Erro crítico ao carregar dados. Verifique o console.</p>";
    }
});
