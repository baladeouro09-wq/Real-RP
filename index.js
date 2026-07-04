const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  ChannelType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const fs = require('fs');

// ─── Configuração ────────────────────────────────────────────────────────────
let config = {};
if (fs.existsSync('./config.json')) {
  config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
}

const TOKEN               = process.env.DISCORD_TOKEN        || config.token;
const APPLICATION_ID      = process.env.APPLICATION_ID       || config.applicationId;
const GUILD_ID            = process.env.GUILD_ID             || config.guildId;
let   STAFF_ROLE_ID       = process.env.STAFF_ROLE_ID        || config.staffRoleId        || '';
let   ADMIN_ROLE_ID       = process.env.ADMIN_ROLE_ID        || config.adminRoleId        || '';
let   LOG_CHANNEL_ID      = process.env.LOG_CHANNEL_ID       || config.logChannelId       || '';
let   SUGGESTIONS_CHANNEL = process.env.SUGGESTIONS_CHANNEL_ID || config.suggestionsChannelId || '';
let   TICKET_CATEGORY_IDS = (() => {
  try {
    const raw = process.env.TICKET_CATEGORY_ID || JSON.stringify(config.ticketCategoryIds || []);
    return JSON.parse(raw);
  } catch { return []; }
})();

// ─── Cores do tema ───────────────────────────────────────────────────────────
const COLOR_RED   = 0xC0392B;
const COLOR_BLACK = 0x1A1A1A;
const COLOR_WHITE = 0xFFFFFF;

// ─── Cliente Discord ─────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

// ─── Utilitários ─────────────────────────────────────────────────────────────
function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync('bot.log', line + '\n'); } catch {}
}

async function sendLog(guild, embed) {
  if (!LOG_CHANNEL_ID) return;
  try {
    const ch = await guild.channels.fetch(LOG_CHANNEL_ID);
    if (ch) await ch.send({ embeds: [embed] });
  } catch {}
}

// ─── Painel principal ─────────────────────────────────────────────────────────
function buildPainelEmbed() {
  return new EmbedBuilder()
    .setColor(COLOR_RED)
    .setTitle('🎫  Real RP — Suporte & Sugestões')
    .setDescription(
      '> Bem-vindo ao painel oficial do **Real RP**.\n\n' +
      '**🎟️ Abrir Ticket** — Precisa de ajuda? Clique abaixo e escolha a categoria.\n' +
      '**💡 Enviar Sugestão** — Tem uma ideia? Partilhe connosco!\n\n' +
      '*A nossa equipa responderá o mais rápido possível.*'
    )
    .setFooter({ text: 'Real RP Support System • vermelho & preto' })
    .setTimestamp();
}

function buildPainelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('open_ticket')
      .setLabel('🎟️ Abrir Ticket')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('open_suggestion')
      .setLabel('💡 Enviar Sugestão')
      .setStyle(ButtonStyle.Secondary),
  );
}

// ─── Categorias de ticket ─────────────────────────────────────────────────────
const TICKET_CATEGORIES = [
  { label: '🛡️ Suporte Geral',      value: 'suporte_geral',      description: 'Dúvidas e problemas gerais' },
  { label: '⚖️ Apelação de Ban',    value: 'apelacao_ban',       description: 'Recorrer de uma punição' },
  { label: '🐛 Report de Bug',      value: 'report_bug',         description: 'Reportar um erro no servidor' },
  { label: '💰 Suporte Financeiro', value: 'suporte_financeiro', description: 'Problemas com compras/doações' },
];

function buildCategoryMenu() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_category')
    .setPlaceholder('Seleciona a categoria do ticket…')
    .addOptions(
      TICKET_CATEGORIES.map(c =>
        new StringSelectMenuOptionBuilder()
          .setLabel(c.label)
          .setValue(c.value)
          .setDescription(c.description)
      )
    );
  return new ActionRowBuilder().addComponents(menu);
}

// ─── Criar canal de ticket ────────────────────────────────────────────────────
async function createTicketChannel(guild, member, categoryValue) {
  const cat = TICKET_CATEGORIES.find(c => c.value === categoryValue);
  const catLabel = cat ? cat.label : categoryValue;

  // Escolhe a categoria de canal (primeira disponível)
  let parentId = TICKET_CATEGORY_IDS[0] || null;

  const channelName = `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString(36)}`;

  const permissionOverwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
  ];

  if (STAFF_ROLE_ID) {
    permissionOverwrites.push({
      id: STAFF_ROLE_ID,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
    });
  }
  if (ADMIN_ROLE_ID && ADMIN_ROLE_ID !== STAFF_ROLE_ID) {
    permissionOverwrites.push({
      id: ADMIN_ROLE_ID,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
    });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parentId,
    permissionOverwrites,
    topic: `Ticket de ${member.user.tag} | Categoria: ${catLabel}`,
  });

  return { channel, catLabel };
}

// ─── Eventos ──────────────────────────────────────────────────────────────────
client.once('ready', () => {
  log(`✅ Bot online como ${client.user.tag}`);
  client.user.setActivity('Real RP | Suporte 24/7', { type: 3 });
});

client.on('interactionCreate', async interaction => {
  try {
    // ── Slash Commands ──────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {

      // /painel
      if (interaction.commandName === 'painel') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.reply({ content: '❌ Não tens permissão para usar este comando.', ephemeral: true });
        }
        await interaction.channel.send({ embeds: [buildPainelEmbed()], components: [buildPainelRow()] });
        await interaction.reply({ content: '✅ Painel enviado!', ephemeral: true });
        log(`Painel enviado por ${interaction.user.tag} em #${interaction.channel.name}`);
      }

      // /setup
      if (interaction.commandName === 'setup') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
        }

        const staffRole   = interaction.options.getRole('staff_role');
        const adminRole   = interaction.options.getRole('admin_role');
        const logChannel  = interaction.options.getChannel('log_channel');
        const sugChannel  = interaction.options.getChannel('suggestions_channel');
        const ticketCat   = interaction.options.getString('ticket_category');

        STAFF_ROLE_ID       = staffRole.id;
        ADMIN_ROLE_ID       = adminRole.id;
        LOG_CHANNEL_ID      = logChannel.id;
        SUGGESTIONS_CHANNEL = sugChannel.id;

        // Tenta encontrar categoria pelo nome ou ID
        const foundCat = interaction.guild.channels.cache.find(
          c => c.type === ChannelType.GuildCategory &&
               (c.id === ticketCat || c.name.toLowerCase() === ticketCat.toLowerCase())
        );
        if (foundCat) TICKET_CATEGORY_IDS = [foundCat.id];

        const embed = new EmbedBuilder()
          .setColor(COLOR_RED)
          .setTitle('⚙️ Configuração Guardada')
          .addFields(
            { name: 'Staff Role',          value: `<@&${STAFF_ROLE_ID}>`,   inline: true },
            { name: 'Admin Role',          value: `<@&${ADMIN_ROLE_ID}>`,   inline: true },
            { name: 'Log Channel',         value: `<#${LOG_CHANNEL_ID}>`,   inline: true },
            { name: 'Sugestões Channel',   value: `<#${SUGGESTIONS_CHANNEL}>`, inline: true },
            { name: 'Ticket Category',     value: foundCat ? foundCat.name : ticketCat, inline: true },
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        log(`Setup executado por ${interaction.user.tag}`);
      }
    }

    // ── Botões ──────────────────────────────────────────────────────────────
    if (interaction.isButton()) {

      // Abrir ticket → mostrar menu de categorias
      if (interaction.customId === 'open_ticket') {
        await interaction.reply({
          content: '📋 Seleciona a categoria do teu ticket:',
          components: [buildCategoryMenu()],
          ephemeral: true,
        });
      }

      // Enviar sugestão → abrir modal
      if (interaction.customId === 'open_suggestion') {
        const modal = new ModalBuilder()
          .setCustomId('suggestion_modal')
          .setTitle('💡 Enviar Sugestão');

        const titleInput = new TextInputBuilder()
          .setCustomId('suggestion_title')
          .setLabel('Título da sugestão')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: Adicionar sistema de empregos')
          .setRequired(true)
          .setMaxLength(100);

        const descInput = new TextInputBuilder()
          .setCustomId('suggestion_desc')
          .setLabel('Descrição detalhada')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Descreve a tua sugestão com o máximo de detalhe possível…')
          .setRequired(true)
          .setMaxLength(1000);

        modal.addComponents(
          new ActionRowBuilder().addComponents(titleInput),
          new ActionRowBuilder().addComponents(descInput),
        );

        await interaction.showModal(modal);
      }

      // Fechar ticket
      if (interaction.customId === 'close_ticket') {
        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID) &&
            !interaction.member.roles.cache.has(ADMIN_ROLE_ID) &&
            !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
          return interaction.reply({ content: '❌ Não tens permissão para fechar este ticket.', ephemeral: true });
        }

        await interaction.reply({ content: '🔒 A fechar o ticket em 5 segundos…' });
        log(`Ticket fechado: #${interaction.channel.name} por ${interaction.user.tag}`);

        await sendLog(interaction.guild, new EmbedBuilder()
          .setColor(COLOR_BLACK)
          .setTitle('🔒 Ticket Fechado')
          .addFields(
            { name: 'Canal',    value: interaction.channel.name, inline: true },
            { name: 'Fechado por', value: interaction.user.tag, inline: true },
          )
          .setTimestamp()
        );

        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
      }

      // Avaliar atendimento
      if (interaction.customId.startsWith('rate_')) {
        const rating = interaction.customId.replace('rate_', '');
        await interaction.reply({ content: `⭐ Obrigado pela tua avaliação: **${rating}**!`, ephemeral: true });
        log(`Avaliação recebida: ${rating} de ${interaction.user.tag}`);
      }

      // Aprovar/Recusar sugestão
      if (interaction.customId.startsWith('suggestion_')) {
        if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID) &&
            !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.reply({ content: '❌ Apenas admins podem gerir sugestões.', ephemeral: true });
        }

        const action = interaction.customId.replace('suggestion_', '');
        const originalEmbed = interaction.message.embeds[0];
        if (!originalEmbed) return;

        const statusMap = {
          approve:  { label: '✅ Aprovada',    color: 0x2ECC71 },
          analyze:  { label: '🔍 Em Análise',  color: 0xF39C12 },
          reject:   { label: '❌ Recusada',    color: COLOR_BLACK },
        };

        const status = statusMap[action];
        if (!status) return;

        const updatedEmbed = EmbedBuilder.from(originalEmbed)
          .setColor(status.color)
          .setFooter({ text: `Estado: ${status.label} • por ${interaction.user.tag}` });

        await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
        await interaction.reply({ content: `✅ Sugestão marcada como **${status.label}**.`, ephemeral: true });
      }
    }

    // ── Select Menu ─────────────────────────────────────────────────────────
    if (interaction.isStringSelectMenu()) {

      if (interaction.customId === 'ticket_category') {
        const categoryValue = interaction.values[0];

        await interaction.deferUpdate();

        const { channel, catLabel } = await createTicketChannel(
          interaction.guild,
          interaction.member,
          categoryValue
        );

        // Mensagem de boas-vindas no ticket
        const welcomeEmbed = new EmbedBuilder()
          .setColor(COLOR_RED)
          .setTitle(`🎫 Ticket — ${catLabel}`)
          .setDescription(
            `Olá ${interaction.user}! 👋\n\n` +
            `Abriste um ticket na categoria **${catLabel}**.\n` +
            `A nossa equipa de staff irá responder em breve.\n\n` +
            `*Descreve o teu problema com o máximo de detalhe possível.*`
          )
          .setFooter({ text: 'Real RP Support • Use o botão abaixo para fechar' })
          .setTimestamp();

        const controlRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('🔒 Fechar Ticket')
            .setStyle(ButtonStyle.Danger),
        );

        await channel.send({
          content: `${interaction.user} ${STAFF_ROLE_ID ? `<@&${STAFF_ROLE_ID}>` : ''}`,
          embeds: [welcomeEmbed],
          components: [controlRow],
        });

        await interaction.followUp({
          content: `✅ Ticket criado! Vai para ${channel}`,
          ephemeral: true,
        });

        log(`Ticket criado: #${channel.name} por ${interaction.user.tag} (${catLabel})`);

        await sendLog(interaction.guild, new EmbedBuilder()
          .setColor(COLOR_RED)
          .setTitle('🎫 Novo Ticket Aberto')
          .addFields(
            { name: 'Utilizador', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
            { name: 'Categoria',  value: catLabel,   inline: true },
            { name: 'Canal',      value: channel.name, inline: true },
          )
          .setTimestamp()
        );
      }
    }

    // ── Modais ──────────────────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {

      if (interaction.customId === 'suggestion_modal') {
        const title = interaction.fields.getTextInputValue('suggestion_title');
        const desc  = interaction.fields.getTextInputValue('suggestion_desc');

        const suggEmbed = new EmbedBuilder()
          .setColor(COLOR_RED)
          .setTitle(`💡 ${title}`)
          .setDescription(desc)
          .addFields({ name: 'Sugerido por', value: `${interaction.user.tag}`, inline: true })
          .setFooter({ text: 'Real RP Sugestões' })
          .setTimestamp();

        const voteRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('suggestion_approve').setLabel('✅ Aprovar').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('suggestion_analyze').setLabel('🔍 Em Análise').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('suggestion_reject').setLabel('❌ Recusar').setStyle(ButtonStyle.Danger),
        );

        if (SUGGESTIONS_CHANNEL) {
          try {
            const sugCh = await interaction.guild.channels.fetch(SUGGESTIONS_CHANNEL);
            if (sugCh) {
              await sugCh.send({ embeds: [suggEmbed], components: [voteRow] });
            }
          } catch {}
        }

        await interaction.reply({
          content: '✅ A tua sugestão foi enviada com sucesso! Obrigado pelo teu contributo.',
          ephemeral: true,
        });

        log(`Sugestão enviada por ${interaction.user.tag}: ${title}`);
      }
    }

  } catch (err) {
    log(`❌ Erro em interactionCreate: ${err.message}`);
    console.error(err);
    try {
      const msg = { content: '❌ Ocorreu um erro ao processar a tua interação.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    } catch {}
  }
});

// ─── Iniciar ──────────────────────────────────────────────────────────────────
if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN não definido. Define a variável de ambiente DISCORD_TOKEN no Railway.');
  process.exit(1);
}

client.login(TOKEN).catch(err => {
  log(`❌ Falha ao fazer login: ${err.message}`);
  process.exit(1);
});
