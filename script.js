<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ferramenta de Reset - Spotify RPG</title>
    <style>
        :root {
            --bg: #121212;
            --surface: #282828;
            --primary: #1DB954;
            --text-primary: #FFFFFF;
            --text-secondary: #B3B3B3;
            --error: #E63946;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg);
            color: var(--text-primary);
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            width: 100%;
            max-width: 600px;
            background-color: var(--surface);
            border-radius: 8px;
            padding: 24px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        h1 {
            color: var(--primary);
            text-align: center;
            margin-top: 0;
        }
        .form-group {
            margin-bottom: 16px;
        }
        label {
            display: block;
            font-weight: 600;
            margin-bottom: 6px;
            color: var(--text-secondary);
        }
        input {
            width: 100%;
            padding: 10px;
            background-color: #3E3E3E;
            border: 1px solid #535353;
            border-radius: 4px;
            color: var(--text-primary);
            font-size: 16px;
            box-sizing: border-box; /* Importante para o padding não quebrar o layout */
        }
        button {
            width: 100%;
            padding: 12px;
            background-color: var(--primary);
            border: none;
            border-radius: 4px;
            color: var(--bg);
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        button:hover {
            background-color: #1ed760;
        }
        button:disabled {
            background-color: #535353;
            cursor: not-allowed;
        }
        .warning {
            background-color: #4d2f30;
            color: #fca5a5;
            border: 1px solid var(--error);
            border-radius: 4px;
            padding: 12px;
            font-size: 14px;
            margin-bottom: 16px;
            line-height: 1.5;
        }
        #log {
            background-color: #000;
            border-radius: 4px;
            padding: 12px;
            font-family: "Courier New", Courier, monospace;
            font-size: 14px;
            white-space: pre-wrap; /* Permite quebra de linha */
            word-wrap: break-word; /* Quebra palavras longas */
            max-height: 300px;
            overflow-y: auto;
            color: #B3B3B3;
            margin-top: 20px;
        }
    </style>
</head>
<body>

    <div class="container">
        <h1>Ferramenta de Reset (Spotify RPG)</h1>
        
        <div class="warning">
            <strong>⚠️ Atenção!</strong> NUNCA salve sua Chave de API (API Key) neste arquivo. Sempre cole-a no campo abaixo na hora de usar.
        </div>

        <div class="form-group">
            <label for="apiKey">Chave de API (pat...)</label>
            <input type="password" id="apiKey" placeholder="Cole sua chave de API aqui (Ex: pat...)">
        </div>
        <div class="form-group">
            <label for="baseId">Base ID</label>
            <input type="text" id="baseId" value="appG5NOoblUmtSMVI" disabled>
        </div>
        <div class="form-group">
            <label for="tableName">Tabela (Digite 'Artists' ou 'Músicas')</label>
            <input type="text" id="tableName" value="Artists">
        </div>

        <button id="resetButton">Zerar Contadores</button>

        <pre id="log">Logs aparecerão aqui...</pre>
    </div>

    <script>
        // ==================================
        // === INÍCIO DA ALTERAÇÃO ===
        // ==================================
        
        // REMOVIDA A LISTA ÚNICA DAQUI

        // NOVO: Mapeamento de tabelas para seus campos específicos
        const TABLE_CONFIGS = {
            'Artists': [
                "Promo_TV_Count",
                "Promo_Radio_Count",
                "Promo_Commercial_Count",
                "Promo_Internet_Count",
                "Remix_Count",
                "MV_Count",
                "Capas_Count",
                "Parceria_Count"
            ],
            'Músicas': [
                "Streams"
                // "Streams Totais" // Se quiser zerar os totais, adicione esta linha
            ]
        };
        // ==================================
        // === FIM DA ALTERAÇÃO ===
        // ==================================

        // Elementos do DOM
        const button = document.getElementById('resetButton');
        const logEl = document.getElementById('log');
        const apiKeyInput = document.getElementById('apiKey');
        const baseIdInput = document.getElementById('baseId');
        const tableNameInput = document.getElementById('tableName');

        // Adiciona o listener ao botão
        button.addEventListener('click', startReset);

        /**
         * Função principal que inicia o processo de reset
         */
        async function startReset() {
            button.disabled = true;
            button.textContent = 'Trabalhando...';
            log('Iniciando processo de reset...');

            const API_KEY = apiKeyInput.value.trim();
            const BASE_ID = baseIdInput.value.trim();
            const TABLE_NAME = tableNameInput.value.trim();
            
            // ==================================
            // === INÍCIO DA ALTERAÇÃO ===
            // ==================================
            
            // Pega a lista de campos CORRETA para a tabela digitada
            const fieldsToReset = TABLE_CONFIGS[TABLE_NAME];

            // Validação: Verifica se a tabela digitada está configurada
            if (!fieldsToReset) {
                log(`❌ ERRO: Tabela "${TABLE_NAME}" não está configurada.`);
                log('Tabelas válidas: ' + Object.keys(TABLE_CONFIGS).join(', '));
                button.disabled = false;
                button.textContent = 'Zerar Contadores';
                return;
            }
            // ==================================
            // === FIM DA ALTERAÇÃO ===
            // ==================================

            if (!API_KEY.startsWith('pat')) {
                log('ERRO: Chave de API inválida. Ela deve começar com "pat".');
                button.disabled = false;
                button.textContent = 'Zerar Contadores';
                return;
            }
            
            try {
                // 1. Buscar todos os registros que precisam ser atualizados
                log('Passo 1: Buscando registros para zerar...');
                
                // MODIFICADO: Passa a lista de campos correta para a função
                const records = await fetchAllRecords(API_KEY, BASE_ID, TABLE_NAME, fieldsToReset);
                
                if (records.length === 0) {
                    log('Nenhum registro com contadores maiores que 0 foi encontrado. Nada a fazer.');
                    button.disabled = false;
                    button.textContent = 'Zerar Contadores';
                    return;
                }

                log(`Encontrados ${records.length} registros para atualizar.`);

                // 2. Criar o payload de atualização (um objeto "fields" com tudo 0)
                const resetFields = {};
                // MODIFICADO: Usa a lista de campos correta
                fieldsToReset.forEach(field => {
                    resetFields[field] = 0;
                });
                
                // Mapeia os registros para o formato de "patch"
                const recordsToUpdate = records.map(record => ({
                    id: record.id,
                    fields: resetFields
                }));

                // 3. Enviar as atualizações em lotes de 10
                log(`Passo 2: Enviando atualizações em lotes...`);
                await batchUpdate(API_KEY, BASE_ID, TABLE_NAME, recordsToUpdate);

                log('---');
                log('✅ SUCESSO! Todos os contadores foram zerados.');

            } catch (error) {
                log(`---`);
                log(`❌ ERRO: ${error.message}`);
                console.error(error);
            } finally {
                button.disabled = false;
                button.textContent = 'Zerar Contadores';
            }
        }

        /**
         * Busca todos os registros de uma tabela que correspondem a um filtro.
         * O filtro busca qualquer registro onde um dos contadores seja > 0.
         */
        
        // MODIFICADO: Adicionado 'fieldsToResetList' como argumento
        async function fetchAllRecords(apiKey, baseId, tableName, fieldsToResetList) {
            let allRecords = [];
            let offset = null;
            
            // MODIFICADO: Usa 'fieldsToResetList' para criar a fórmula
            const filterFormula = "OR(" + fieldsToResetList.map(field => `{${field}} > 0`).join(', ') + ")";
            const encodedFilter = encodeURIComponent(filterFormula);

            do {
                const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?filterByFormula=${encodedFilter}` + (offset ? `&offset=${offset}` : '');

                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(`Erro ao buscar no Airtable: ${error.error?.message || response.statusText}`);
                }

                const data = await response.json();
                allRecords.push(...data.records);
                offset = data.offset;

            } while (offset);

            return allRecords;
        }

        /**
         * Atualiza registros no Airtable em lotes de 10 (limite da API).
         */
        async function batchUpdate(apiKey, baseId, tableName, records) {
            const MAX_RECORDS_PER_REQUEST = 10;

            for (let i = 0; i < records.length; i += MAX_RECORDS_PER_REQUEST) {
                const chunk = records.slice(i, i + MAX_RECORDS_PER_REQUEST);
                log(`Atualizando lote ${Math.floor(i / 10) + 1}/${Math.ceil(records.length / 10)}... (Registros ${i + 1} a ${i + chunk.length})`);
                
                const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
                
                const response = await fetch(url, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ records: chunk })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(`Erro ao atualizar lote no Airtable: ${error.error?.message || response.statusText}`);
                }
                
                await response.json(); // Consome a resposta
            }
        }

        /**
         * Função helper para escrever mensagens no log da tela.
         */
        function log(message) {
            logEl.textContent += `\n${message}`;
            logEl.scrollTop = logEl.scrollHeight; // Rola para o final
        }

    </script>
</body>
</html>
