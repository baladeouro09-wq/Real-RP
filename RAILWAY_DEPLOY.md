# 🚀 Deploy no Railway

Segue estes passos para colocar o bot online no Railway:

## Passo 1: Prepare o GitHub
1. Va a github.com e crie uma conta (ou login)
2. Crie um novo repositório chamado `bot-real-rp`
3. Faça upload dos ficheiros do bot para lá

## Passo 2: Railway
1. Va a railway.app
2. Faça login com GitHub
3. Clique em "New Project"
4. Selecione "Deploy from GitHub repo"
5. Escolha o repositório `bot-real-rp`
6. Deixe Railway fazer o deploy automático

## Passo 3: Variáveis de Ambiente
1. No Railway, vá em "Variables"
2. Adicione as variáveis do seu `.env.example`:
   - DISCORD_TOKEN = (token do seu bot Discord)
   - APPLICATION_ID = (ID da aplicação)
   - GUILD_ID = (ID do servidor Discord)
   - STAFF_ROLE_ID = (ID da role de staff)
   - ADMIN_ROLE_ID = (ID da role de admin)
   - LOG_CHANNEL_ID = (ID do canal de logs)
   - SUGGESTIONS_CHANNEL_ID = (ID do canal de sugestões)
   - TICKET_CATEGORY_ID = (IDs em formato JSON: ["id1","id2","id3","id4"])

## Pronto!
O bot vai estar online 24/7. Quando fizer mudanças no GitHub, Railway faz deploy automático.

---

**Informações para as variáveis:**
- DISCORD_TOKEN: Encontra em config.json
- APPLICATION_ID: Encontra em config.json
- GUILD_ID: Encontra em config.json
- etc...
