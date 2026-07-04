# Real RP Support Bot

Sistema de Tickets e Sugestões para servidor Real RP com visual moderno em vermelho, preto e branco.

## Funcionalidades

- Painel interativo com **Abrir Ticket** e **Enviar Sugestão**
- Categorias de tickets com criação automática de canal privado
- Modal para apelação de ban com campos completos
- Mensagens de boas-vindas e botões de controle
- Logs em canal administrativo
- Sistema de avaliação de atendimento
- Sugestões publicadas automaticamente em `#sugestões`
- Estados de sugestão: aprovada, em análise, recusada

## Setup

1. Copie `config.json.example` para `config.json`.
2. Preencha o token e os IDs do bot em `config.json`, incluindo `applicationId`.
3. Instale dependências:

```bash
npm install
```

4. Registre os comandos `/painel` e `/setup`:

```bash
npm run deploy
```

5. Use `/setup` no Discord para gravar automaticamente os IDs de cargo e canal:

```bash
/setup staff_role:@Staff admin_role:@Admin log_channel:#logs suggestions_channel:#sugestões ticket_category:Tickets
```

6. Inicie o bot:

```bash
npm start
```

## Deploy 24/7

O bot já está preparado para correr em plataformas como Railway ou Render.

### Opção 1: Railway
- Faça o push para um repositório GitHub.
- Aceda a railway.app e crie um novo projeto a partir desse repositório.
- Defina as variáveis do ficheiro `.env.example` no painel do Railway.
- O bot fica online 24/7 enquanto o serviço estiver ativo.

### Opção 2: Render
- Faça o push para GitHub.
- Crie um novo serviço em render.com usando o repositório.
- Adicione as mesmas variáveis de ambiente.
- O serviço inicia automaticamente com `npm start`.

## Requisitos do Discord

- Permissões do bot: Gerenciar Canais, Enviar Mensagens, Gerenciar Mensagens, Gerenciar Permissões, Ler o Histórico de Mensagens.
- Papéis configurados em `config.json`.
