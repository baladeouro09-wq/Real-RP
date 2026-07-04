const fs = require('fs');
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  AttachmentBuilder,
} = require('discord.js');

// Suporta variáveis de ambiente (Railway) ou config.json local
const configPath = './config.json';
let config = {};

if (process.env.DISCORD_TOKEN) {
  config = {
    token: process.env.DISCORD_TOKEN,
    applicationId: process.env.APPLICATION_ID,
    guildId: process.env.GUILD_ID,
    staffRoleId: process.env.STAFF_ROLE_ID,
    adminRoleId: process.env.ADMIN_ROLE_ID,
    logChannelId: process.env.BOT_LOG_CHANNEL_ID || process.env.LOG_CHANNEL_ID,
    ticketLogChannelId: process.env.TICKET_LOG_CHANNEL_ID || process.env.LOG_CHANNEL_ID,
    inviteLogChannelId: process.env.INVITE_LOG_CHANNEL_ID || process.env.LOG_CHANNEL_ID,
    suggestionsChannelId: process.env.SUGGESTIONS_CHANNEL_ID,
    ticketCategoryId: process.env.TICKET_CATEGORY_ID ? JSON.parse(process.env.TICKET_CATEGORY_ID) : [],
  };
} else if (fs.existsSync(configPath)) {
  config = require(configPath);
} else {
  throw new Error('Nenhum config.json encontrado e nenhuma variável de ambiente DISCORD_TOKEN foi definida.');
}

function getLogChannelId(type = 'general') {
  if (type === 'ticket') return config.ticketLogChannelId || config.logChannelId || config.botLogChannelId;
  if (type === 'invite') return config.inviteLogChannelId || config.logChannelId || config.botLogChannelId;
  return config.logChannelId || config.botLogChannelId;
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers],
  partials: [Partials.Channel],
});

const ticketCategories = {
  support: { label: 'Suporte Geral', emoji: '🛠️' },
  denuncias: { label: 'Denúncias', emoji: '🚨' },
  bugs: { label: 'Reportar Bugs', emoji: '🐞' },
  parcerias: { label: 'Parcerias', emoji: '🤝' },
  vip: { label: 'VIP/Loja', emoji: '💎' },
  ban: { label: 'Ban / Apelação de Ban', emoji: '🔨' },
};

const suggestionCategories = {
  servidor: 'Servidor',
  economia: 'Economia',
  policia: 'Polícia',
  staff: 'Staff',
  eventos: 'Eventos',
  outros: 'Outros',
};

const colors = {
  red: 0xff0000,
  black: 0x000000,
  white: 0xffffff,
};

const suggestionModeratorIds = ['1522644295486537765', '1522644295486537766', '1522644295486537767'];

const ticketPanelEmbed = new EmbedBuilder()
  .setTitle('Painel de Tickets do Real RP')
  .setDescription('Seleciona a categoria abaixo para abrir um ticket. A nossa equipa responderá o mais rapidamente possível.')
  .setColor(colors.red)
  .setThumbnail('attachment://real-rp-logo.png')
  .addFields(
    { name: '🎫 Tickets', value: 'Abra um ticket para suporte, denúncias, bugs, parcerias, VIP ou apelação de ban.', inline: false },
  )
  .setFooter({ text: 'Real RP Support • Design premium vermelho e preto' });

const suggestionPanelEmbed = new EmbedBuilder()
  .setTitle('Painel de Sugestões do Real RP')
  .setDescription('Envie a sua sugestão para melhorar o Real RP. A nossa equipa irá analisar e responder o mais rápido possível.')
  .setColor(colors.red)
  .setThumbnail('attachment://real-rp-logo.png')
  .addFields(
    { name: '💡 Sugestões', value: 'Envie uma sugestão para melhorar o Real RP.', inline: false },
  )
  .setFooter({ text: 'Real RP Support • Design premium vermelho e preto' });

function createButton(label, customId, style = ButtonStyle.Primary, emoji = null) {
  const button = new ButtonBuilder().setLabel(label).setCustomId(customId).setStyle(style);
  if (emoji) {
    button.setEmoji(emoji);
  }
  return button;
}

function buildTicketPanel() {
  return [
    new ActionRowBuilder().addComponents(
      createButton('Abrir Ticket', 'open_ticket', ButtonStyle.Danger, '🎫'),
    ),
  ];
}

function buildSuggestionPanel() {
  return [
    new ActionRowBuilder().addComponents(
      createButton('Enviar Sugestão', 'open_suggestion', ButtonStyle.Secondary, '💡'),
    ),
  ];
}

function buildPanel() {
  return [
    new ActionRowBuilder().addComponents(
      createButton('Abrir Ticket', 'open_ticket', ButtonStyle.Danger, '🎫'),
      createButton('Enviar Sugestão', 'open_suggestion', ButtonStyle.Secondary, '💡'),
    ),
  ];
}

function buildTicketCategoryMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('select_ticket_category')
      .setPlaceholder('Seleciona a categoria do ticket')
      .addOptions(Object.entries(ticketCategories).map(([value, data]) => ({
        label: data.label,
        value,
        description: `Abrir ticket de ${data.label}`,
        emoji: data.emoji,
      }))),
  );
}

function buildTicketActions(isClosed = false) {
  return [
    new ActionRowBuilder().addComponents(
      createButton(isClosed ? '🔓 Reabrir Ticket' : '🔒 Fechar Ticket', isClosed ? 'ticket_reopen' : 'ticket_close', ButtonStyle.Success),
      createButton('📄 Guardar Transcrição', 'ticket_transcript', ButtonStyle.Secondary),
      createButton('🗑️ Apagar Ticket', 'ticket_delete', ButtonStyle.Danger),
    ),
  ];
}

function buildTicketRateButtons() {
  return [
    new ActionRowBuilder().addComponents(
      createButton('⭐ 1', 'ticket_rating_1', ButtonStyle.Secondary),
      createButton('⭐ 2', 'ticket_rating_2', ButtonStyle.Secondary),
      createButton('⭐ 3', 'ticket_rating_3', ButtonStyle.Secondary),
      createButton('⭐ 4', 'ticket_rating_4', ButtonStyle.Secondary),
      createButton('⭐ 5', 'ticket_rating_5', ButtonStyle.Secondary),
    ),
  ];
}

function buildSuggestionStatusButtons() {
  return [
    new ActionRowBuilder().addComponents(
      createButton('🟢 Aprovada', 'suggestion_status_approved', ButtonStyle.Success),
      createButton('🟡 Em análise', 'suggestion_status_review', ButtonStyle.Primary),
      createButton('🔴 Recusada', 'suggestion_status_denied', ButtonStyle.Danger),
    ),
  ];
}

function isStaff(member) {
  if (!member) return false;
  return suggestionModeratorIds.includes(member.id) || member.roles.cache.has(config.staffRoleId) || member.roles.cache.has(config.adminRoleId);
}

function isAdmin(member) {
  return member.roles.cache.has(config.adminRoleId);
}

function sanitizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 80);
}

function getTicketState(channel) {
  const topic = channel.topic || '';
  if (topic.includes('Estado: Fechado')) return 'fechado';
  return 'aberto';
}

function saveConfig() {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

function getTicketOwnerIds(channel) {
  return channel.permissionOverwrites.cache
    .filter(po => po.type === 'member' && po.id !== config.adminRoleId && po.id !== config.staffRoleId)
    .map(po => po.id);
}

async function createTicketChannel(interaction, categoryKey, banData = null) {
  const guild = interaction.guild;
  const user = interaction.user;
  const category = ticketCategories[categoryKey];
  const sanitized = sanitizeName(`ticket-${categoryKey}-${user.username}`);

  const ticketParent = Array.isArray(config.ticketCategoryId)
    ? config.ticketCategoryId[0]
    : config.ticketCategoryId;

  const channel = await guild.channels.create({
    name: sanitized,
    type: ChannelType.GuildText,
    parent: ticketParent || undefined,
    topic: `Ticket ${category.label} | Criado por ${user.tag} | Estado: Aberto`,
    permissionOverwrites: [
      {
        id: guild.roles.everyone,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.EmbedLinks,
        ],
      },
      {
        id: config.staffRoleId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.EmbedLinks,
        ],
      },
      {
        id: config.adminRoleId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.EmbedLinks,
        ],
      },
    ],
  });

  const ticketEmbed = new EmbedBuilder()
    .setTitle(`${category.emoji} Ticket criado: ${category.label}`)
    .setDescription(`Olá ${user}, a tua equipa de suporte foi notificada. Usa os botões abaixo para gerir este ticket.`)
    .addFields(
      { name: 'Categoria', value: category.label, inline: true },
      { name: 'Criador', value: `${user.tag}`, inline: true },
      { name: 'Estado', value: 'Aberto', inline: true },
    )
    .setColor(colors.red)
    .setFooter({ text: 'Real RP • Sistema de Tickets' })
    .setTimestamp();

  if (banData) {
    ticketEmbed.addFields(
      { name: 'Nome IC', value: banData.nameIC || 'Não informado', inline: true },
      { name: 'ID Discord', value: banData.discordId || 'Não informado', inline: true },
      { name: 'Steam Hex', value: banData.steamHex || 'Não informado', inline: true },
      { name: 'Data do ban', value: banData.banDate || 'Não informado', inline: true },
      { name: 'Staff responsável', value: banData.staff || 'Não informado', inline: true },
      { name: 'Motivo do ban', value: banData.banReason || 'Não informado', inline: false },
      { name: 'Porque deve ser revisto?', value: banData.reviewReason || 'Não informado', inline: false },
      { name: 'Provas', value: banData.proof || 'Não informado', inline: false },
    );
  }

  const welcomeEmbed = new EmbedBuilder()
    .setTitle('📌 Ticket Privado')
    .setDescription('A equipa de staff já pode ver este ticket. Responde aqui para continuar o atendimento.')
    .setColor(colors.black)
    .setFooter({ text: 'Utiliza os botões para fechar, reabrir, guardar transcrição ou apagar.' })
    .setTimestamp();

  await channel.send({ embeds: [ticketEmbed, welcomeEmbed], components: [...buildTicketActions(false), ...buildTicketRateButtons()] });

  await sendLog({
    title: 'Ticket Aberto',
    description: `${user} abriu um ticket de **${category.label}**.`,
    fields: [
      { name: 'Canal', value: `${channel}`, inline: true },
      { name: 'Categoria', value: category.label, inline: true },
    ],
    type: 'ticket',
  });

  return channel;
}

async function sendSuggestionEmbed(interaction, values) {
  console.log('[sugestao] interaction channel:', interaction.channelId, 'suggestionsChannelId:', config.suggestionsChannelId);
  console.log('[sugestao] interaction.channel:', !!interaction.channel, 'isTextBased:', interaction.channel?.isTextBased?.());
  if (!config.suggestionsChannelId) {
    console.log('[sugestao] no suggestionsChannelId');
    return false;
  }

  let channel = null;
  if (interaction.channelId === config.suggestionsChannelId && interaction.channel?.isTextBased()) {
    channel = interaction.channel;
    console.log('[sugestao] using interaction.channel');
  } else {
    channel = await interaction.guild.channels.fetch(config.suggestionsChannelId).catch(error => {
      console.error('[sugestao] fetch error:', error);
      return null;
    });
    console.log('[sugestao] fetched channel:', channel?.id, 'type:', channel?.type, 'isTextBased:', channel?.isTextBased?.());
  }

  if (!channel || !channel.isTextBased()) {
    console.log('[sugestao] invalid channel object or not text based');
    return false;
  }

  const embed = new EmbedBuilder()
    .setTitle(values.title)
    .setDescription(values.description)
    .addFields(
      { name: 'Categoria', value: suggestionCategories[values.category] || 'Outros', inline: true },
      { name: 'Autor', value: `${interaction.user}`, inline: true },
      { name: 'Estado', value: '🟡 Em análise', inline: true },
    )
    .setColor(colors.red)
    .setFooter({ text: 'Real RP • Sugestões' })
    .setTimestamp();

  let message;
  try {
    message = await channel.send({ embeds: [embed], components: buildSuggestionStatusButtons() });
    await message.react('✅');
    await message.react('❌');
  } catch (error) {
    console.error('Erro ao enviar sugestão ou reagir:', error);
    return false;
  }

  try {
    await sendLog({
      title: 'Nova Sugestão',
      description: `${interaction.user} enviou uma sugestão.`,
      fields: [
        { name: 'Categoria', value: suggestionCategories[values.category] || 'Outros', inline: true },
        { name: 'Sugestão', value: values.title, inline: true },
        { name: 'Mensagem', value: values.description.slice(0, 1024), inline: false },
      ],
    });
  } catch (error) {
    console.error('Erro ao enviar log de sugestão:', error);
  }

  return !!message;
}

async function updateSuggestionState(interaction, state, label, color) {
  const message = interaction.message;
  if (!message) return;
  const embed = EmbedBuilder.from(message.embeds[0]);
  if (!embed) return;
  embed.spliceFields(2, 1, { name: 'Estado', value: label, inline: true });
  embed.setColor(color);
  await message.edit({ embeds: [embed] });
  await interaction.reply({ content: `Sugestão atualizada para **${label}**.`, ephemeral: true });
  await sendLog({
    title: 'Estado de Sugestão Alterado',
    description: `${interaction.user} definiu o estado para **${label}**.`,
    fields: [{ name: 'Sugestão', value: embed.data.title || 'Sem título', inline: false }],
  });
}

async function sendLog({ title, description, fields = [], type = 'general' }) {
  const channelId = getLogChannelId(type);
  if (!channelId) {
    console.warn(`[logs] Nenhum canal configurado para ${type}`);
    return;
  }

  try {
    const logChannel = await client.channels.fetch(channelId);
    if (!logChannel || !logChannel.isTextBased()) {
      console.warn(`[logs] Canal ${channelId} para ${type} não encontrado ou não é um canal de texto.`);
      return;
    }

    const permissions = logChannel.permissionsFor(client.user?.id);
    const hasRequiredPerms = permissions?.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks]);
    if (!hasRequiredPerms) {
      console.warn(`[logs] O bot não tem permissões suficientes no canal ${channelId} (${type}). Verifica View Channel, Send Messages e Embed Links.`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .addFields(fields)
      .setColor(colors.red)
      .setTimestamp()
      .setFooter({ text: type === 'ticket' ? 'Real RP Tickets' : type === 'invite' ? 'Real RP Convites' : 'Real RP Logs' });

    await logChannel.send({ embeds: [embed] });
    console.log(`[logs] Enviado com sucesso para ${type} (${channelId})`);
  } catch (error) {
    console.error(`[logs] Erro ao enviar log (${type}) para ${channelId}:`, error);
  }
}

async function createTranscript(channel, requester) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  const transcript = sorted.map(msg => {
    const time = new Date(msg.createdTimestamp).toLocaleString('pt-BR');
    return `[${time}] ${msg.author.tag}: ${msg.content || '[sem texto]'}${msg.attachments.size ? ` [Anexos: ${msg.attachments.map(a => a.url).join(', ')}]` : ''}`;
  }).join('\n');

  const fileName = `transcript-${channel.id}.txt`;
  const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf8'), { name: fileName });

  const ticketLogChannelId = getLogChannelId('ticket');
  await client.channels.fetch(ticketLogChannelId).then(async logChannel => {
    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send({ content: `Transcrição do ticket enviada por ${requester.tag}.`, files: [attachment] });
    }
  });
}

client.on(Events.GuildMemberAdd, async member => {
  try {
    if (member.user.bot) return;

    const roleId = '1522644295234883756';
    const role = member.guild.roles.cache.get(roleId) || await member.guild.roles.fetch(roleId).catch(() => null);

    if (!role) {
      console.warn(`[join-role] Role ${roleId} não encontrada no servidor ${member.guild.id}`);
      return;
    }

    await member.roles.add(role);

    await sendLog({
      title: 'Novo membro entrou',
      description: `${member.user} entrou no servidor e recebeu a role inicial.`,
      fields: [
        { name: 'Usuário', value: `${member.user.tag}`, inline: true },
        { name: 'ID', value: member.id, inline: true },
      ],
      type: 'invite',
    });
  } catch (error) {
    console.error('Erro ao atribuir a role ao entrar:', error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'painel' || interaction.commandName === 'painel_tickets') {
        if (interaction.commandName === 'painel_tickets') {
          const allowedUserIds = ['1522644295486537767', '1522644295486537766', '1522644295486537765'];
          const member = interaction.member;
          const hasRoleAccess = member && member.roles && (member.roles.cache.has(config.staffRoleId) || member.roles.cache.has(config.adminRoleId));
          const canOpenTicketPanel = allowedUserIds.includes(interaction.user.id) || hasRoleAccess;

          if (!canOpenTicketPanel) {
            await interaction.reply({ content: 'Só utilizadores autorizados podem abrir o painel de tickets.', ephemeral: true });
            return;
          }

          await interaction.reply({ embeds: [ticketPanelEmbed], components: buildTicketPanel(), files: [{ attachment: './assets/real-rp-logo.png', name: 'real-rp-logo.png' }] });
          return;
        }

        await interaction.reply({ embeds: [ticketPanelEmbed], components: buildPanel(), files: [{ attachment: './assets/real-rp-logo.png', name: 'real-rp-logo.png' }] });
        return;
      }

      if (interaction.commandName === 'sugestao') {
        console.log('[sugestao command] channelId:', interaction.channelId, 'guildId:', interaction.guildId, 'options:', {
          titulo: interaction.options.getString('titulo', true),
          descricao: interaction.options.getString('descricao', true),
          categoria: interaction.options.getString('categoria', true),
        });
        if (interaction.channelId !== '1522644297973895175') {
          console.log('[sugestao command] invalid command channel');
          await interaction.reply({ content: 'Este comando só pode ser usado no canal de sugestões configurado.', ephemeral: true });
          return;
        }

        const title = interaction.options.getString('titulo', true);
        const description = interaction.options.getString('descricao', true);
        const category = interaction.options.getString('categoria', true).toLowerCase();
        const mapped = Object.keys(suggestionCategories).find(key => suggestionCategories[key].toLowerCase() === category) || 'outros';

        const success = await sendSuggestionEmbed(interaction, { title, description, category: mapped });
        if (!success) {
          await interaction.reply({ content: 'Não foi possível enviar a sugestão. Verifique se o canal de sugestões está configurado corretamente.', ephemeral: true });
          return;
        }

        await interaction.reply({ content: 'Sugestão enviada com sucesso! Obrigado por contribuir com o Real RP.', ephemeral: true });
        return;
      }

      if (interaction.commandName === 'setup') {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
          await interaction.reply({ content: 'Apenas administradores podem usar este comando.', ephemeral: true });
          return;
        }

        const staffRole = interaction.options.getRole('staff_role');
        const adminRole = interaction.options.getRole('admin_role');
        const logChannel = interaction.options.getChannel('log_channel');
        const suggestionsChannel = interaction.options.getChannel('suggestions_channel');
        const ticketCategory = interaction.options.getChannel('ticket_category');

        config.staffRoleId = staffRole.id;
        config.adminRoleId = adminRole.id;
        config.logChannelId = logChannel.id;
        config.suggestionsChannelId = suggestionsChannel.id;
        config.ticketCategoryId = ticketCategory.id;
        saveConfig();

        await interaction.reply({ content: 'Configuração inicial gravada com sucesso! O sistema de tickets e sugestões já está pronto para uso.', ephemeral: true });
        await sendLog({
          title: 'Configuração Inicial Atualizada',
          description: `${interaction.user.tag} atualizou as configurações do sistema Real RP.`,
          fields: [
            { name: 'Staff Role', value: config.staffRoleId, inline: true },
            { name: 'Admin Role', value: config.adminRoleId, inline: true },
            { name: 'Log Channel', value: config.logChannelId, inline: true },
            { name: 'Sugestões Channel', value: config.suggestionsChannelId, inline: true },
            { name: 'Categoria de Tickets', value: config.ticketCategoryId, inline: true },
          ],
        });
        return;
      }

      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'open_ticket') {
        await interaction.reply({ content: 'Seleciona a categoria do ticket abaixo.', components: [buildTicketCategoryMenu()], ephemeral: true });
        return;
      }

      if (interaction.customId === 'open_suggestion') {
        if (!config.suggestionsChannelId) {
          await interaction.reply({ content: 'O canal de sugestões não está configurado. Use /setup para configurar o sistema antes de enviar sugestões.', ephemeral: true });
          return;
        }

        const suggestionsChannel = await interaction.guild.channels.fetch(config.suggestionsChannelId).catch(() => null);
        if (!suggestionsChannel || !suggestionsChannel.isTextBased()) {
          await interaction.reply({ content: 'O canal de sugestões configurado não é válido. Use /setup para corrigir o canal.', ephemeral: true });
          return;
        }

        const modal = new ModalBuilder().setCustomId('suggestion_modal').setTitle('Enviar Sugestão ao Real RP');

        const titleInput = new TextInputBuilder().setCustomId('suggest_title').setLabel('Título da sugestão').setStyle(TextInputStyle.Short).setPlaceholder('Ex: Melhorar sistema de eventos').setRequired(true);
        const descriptionInput = new TextInputBuilder().setCustomId('suggest_description').setLabel('Descrição').setStyle(TextInputStyle.Paragraph).setPlaceholder('Explique a sua sugestão').setRequired(true);
        const categoryInput = new TextInputBuilder().setCustomId('suggest_category').setLabel('Categoria (Servidor, Economia, Polícia, Staff, Eventos, Outros)').setStyle(TextInputStyle.Short).setPlaceholder('Ex: Economia').setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(titleInput),
          new ActionRowBuilder().addComponents(descriptionInput),
          new ActionRowBuilder().addComponents(categoryInput),
        );

        try {
          await interaction.showModal(modal);
        } catch (error) {
          console.error('Erro ao abrir modal de sugestão:', error);
          await interaction.reply({ content: 'Erro interno ao abrir o formulário de sugestão. Tenta novamente mais tarde.', ephemeral: true });
        }
        return;
      }

      const channel = interaction.channel;
      const isTicket = channel && channel.isTextBased() && channel.name.startsWith('ticket-');
      const isSuggestion = interaction.customId.startsWith('suggestion_status_');

      if (isSuggestion) {
        if (!isStaff(interaction.member)) {
          await interaction.reply({ content: 'Apenas staff pode alterar o estado da sugestão.', ephemeral: true });
          return;
        }
        if (interaction.customId === 'suggestion_status_approved') {
          await updateSuggestionState(interaction, 'approved', '🟢 Aprovada', colors.red);
        } else if (interaction.customId === 'suggestion_status_review') {
          await updateSuggestionState(interaction, 'review', '🟡 Em análise', colors.black);
        } else if (interaction.customId === 'suggestion_status_denied') {
          await updateSuggestionState(interaction, 'denied', '🔴 Recusada', colors.black);
        }
        return;
      }

      if (!isTicket) {
        return;
      }

      const ownerId = channel.permissionOverwrites.cache.find(po => po.type === 'member' && po.id === interaction.user.id);
      const isOwner = Boolean(ownerId);
      const canManage = isStaff(interaction.member) || isOwner;
      if (!canManage) {
        await interaction.reply({ content: 'Só o criador ou a equipa de staff pode gerir este ticket.', ephemeral: true });
        return;
      }

      if (interaction.customId === 'ticket_close') {
        const owners = getTicketOwnerIds(channel);
        await Promise.all(owners.map(ownerId => channel.permissionOverwrites.edit(ownerId, { SendMessages: false })));
        await channel.setTopic((channel.topic || '').replace('Estado: Aberto', 'Estado: Fechado'));
        await interaction.reply({ content: 'Ticket fechado. Pode ser reaberto com o botão abaixo.', ephemeral: true });
        await channel.send({ content: '🔒 Ticket fechado. A equipa pode reabrir quando necessário.', components: buildTicketActions(true) });
        await sendLog({ title: 'Ticket Fechado', description: `${interaction.user} fechou o ticket ${channel}.`, fields: [], type: 'ticket' });
        return;
      }

      if (interaction.customId === 'ticket_reopen') {
        const owners = getTicketOwnerIds(channel);
        await Promise.all(owners.map(ownerId => channel.permissionOverwrites.edit(ownerId, { SendMessages: true })));
        await channel.setTopic((channel.topic || '').replace('Estado: Fechado', 'Estado: Aberto'));
        await interaction.reply({ content: 'Ticket reaberto com sucesso.', ephemeral: true });
        await channel.send({ content: '🔓 Ticket reaberto. Continua o atendimento.', components: buildTicketActions(false) });
        await sendLog({ title: 'Ticket Reaberto', description: `${interaction.user} reabriu o ticket ${channel}.`, fields: [], type: 'ticket' });
        return;
      }

      if (interaction.customId === 'ticket_transcript') {
        await interaction.reply({ content: 'A transcrição está a ser gerada e enviada para os logs.', ephemeral: true });
        await createTranscript(channel, interaction.user);
        await sendLog({ title: 'Transcrição Guardada', description: `${interaction.user} guardou a transcrição do ticket ${channel}.`, fields: [], type: 'ticket' });
        return;
      }

      if (interaction.customId === 'ticket_delete') {
        await interaction.reply({ content: 'Ticket apagado. O canal será removido em breve.', ephemeral: true });
        await sendLog({ title: 'Ticket Apagado', description: `${interaction.user} apagou o ticket ${channel}.`, fields: [], type: 'ticket' });
        setTimeout(async () => {
          if (channel.deletable) {
            await channel.delete().catch(() => null);
          }
        }, 1500);
        return;
      }

      if (interaction.customId.startsWith('ticket_rating_')) {
        const rating = interaction.customId.split('_').pop();
        await interaction.reply({ content: `Obrigado pelo seu comentário! Avaliação recebida: ${rating} estrela(s).`, ephemeral: true });
        await sendLog({ title: 'Avaliação de Ticket', description: `${interaction.user} avaliou o atendimento com ${rating} estrela(s).`, fields: [{ name: 'Ticket', value: `${channel}`, inline: true }], type: 'ticket' });
        return;
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_ticket_category') {
        const value = interaction.values[0];
        if (value === 'ban') {
          const modal = new ModalBuilder().setCustomId('ban_ticket_modal').setTitle('Apelação de Ban - Real RP');
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('ban_nameIC').setLabel('Nome IC').setStyle(TextInputStyle.Short).setRequired(true),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('ban_discordId').setLabel('ID do Discord').setStyle(TextInputStyle.Short).setRequired(true),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('ban_steamHex').setLabel('Steam Hex').setStyle(TextInputStyle.Short).setRequired(true),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('ban_date').setLabel('Data do ban').setStyle(TextInputStyle.Short).setRequired(true),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('ban_staff').setLabel('Staff que aplicou o ban (se souber)').setStyle(TextInputStyle.Short).setRequired(false),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('ban_reason').setLabel('Motivo do ban').setStyle(TextInputStyle.Paragraph).setRequired(true),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('ban_reviewReason').setLabel('Porque achas que o ban deve ser revisto?').setStyle(TextInputStyle.Paragraph).setRequired(true),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('ban_proof').setLabel('Tens provas? (Link)').setStyle(TextInputStyle.Short).setRequired(false),
            ),
          );
          await interaction.showModal(modal);
          return;
        }
        await createTicketChannel(interaction, value);
        await interaction.reply({ content: 'Ticket criado com sucesso! Verifica o canal privado.', ephemeral: true });
        return;
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'ban_ticket_modal') {
        const banData = {
          nameIC: interaction.fields.getTextInputValue('ban_nameIC'),
          discordId: interaction.fields.getTextInputValue('ban_discordId'),
          steamHex: interaction.fields.getTextInputValue('ban_steamHex'),
          banDate: interaction.fields.getTextInputValue('ban_date'),
          staff: interaction.fields.getTextInputValue('ban_staff'),
          banReason: interaction.fields.getTextInputValue('ban_reason'),
          reviewReason: interaction.fields.getTextInputValue('ban_reviewReason'),
          proof: interaction.fields.getTextInputValue('ban_proof'),
        };
        await createTicketChannel(interaction, 'ban', banData);
        await interaction.reply({ content: 'Apelação de ban criada com sucesso! O teu ticket privado já foi aberto.', ephemeral: true });
        return;
      }

      if (interaction.customId === 'suggestion_modal') {
        const categoryValue = interaction.fields.getTextInputValue('suggest_category').toLowerCase();
        const mapped = Object.keys(suggestionCategories).find(key => suggestionCategories[key].toLowerCase() === categoryValue) || 'outros';
        const success = await sendSuggestionEmbed(interaction, {
          title: interaction.fields.getTextInputValue('suggest_title'),
          description: interaction.fields.getTextInputValue('suggest_description'),
          category: mapped,
        });

        if (!success) {
          await interaction.reply({ content: 'Não foi possível enviar a sugestão. Verifique se o canal de sugestões está configurado corretamente.', ephemeral: true });
          return;
        }

        await interaction.reply({ content: 'Sugestão enviada com sucesso! Obrigado por contribuir com o Real RP.', ephemeral: true });
        return;
      }
    }
  } catch (error) {
    console.error('Erro na interação:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Ocorreu um erro ao processar esta interação.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Ocorreu um erro ao processar esta interação.', ephemeral: true });
    }
  }
});

client.once(Events.Ready, async () => {
  console.log(`Bot pronto como ${client.user.tag}`);
  try {
    await client.user.setUsername('Real RP');
    await client.user.setAvatar('./assets/real-rp-logo.png');
    console.log('Bot renomeado para Real RP e avatar atualizado.');
  } catch (error) {
    console.warn('Não foi possível atualizar o nome ou avatar do bot:', error.message);
  }

  await sendLog({
    title: 'Teste de logs',
    description: 'O bot iniciou e esta mensagem confirma que os logs estão a funcionar.',
    fields: [
      { name: 'Tipo', value: 'Geral', inline: true },
      { name: 'Canal', value: config.logChannelId, inline: true },
    ],
    type: 'general',
  });

  await sendLog({
    title: 'Teste de logs de tickets',
    description: 'Esta mensagem confirma o canal de tickets.',
    fields: [{ name: 'Canal', value: config.ticketLogChannelId || config.logChannelId, inline: true }],
    type: 'ticket',
  });

  await sendLog({
    title: 'Teste de logs de convites',
    description: 'Esta mensagem confirma o canal de convites.',
    fields: [{ name: 'Canal', value: config.inviteLogChannelId || config.logChannelId, inline: true }],
    type: 'invite',
  });
});

if (!config.token || typeof config.token !== 'string' || config.token.trim().length === 0) {
  console.error('Erro: DISCORD_TOKEN não está definido ou está vazio. Verifique as variáveis de ambiente no Railway.');
  process.exit(1);
}

client.login(config.token.trim()).catch(error => {
  console.error('Erro ao iniciar o bot com o token fornecido:', error.message);
  process.exit(1);
});
