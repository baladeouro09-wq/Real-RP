const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextInputBuilder, TextInputStyle, ModalBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('./config.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let guildConfig = {
  staffRoleId: config.staffRoleId,
  adminRoleId: config.adminRoleId,
  logChannelId: config.logChannelId,
  suggestionsChannelId: config.suggestionsChannelId,
  ticketCategoryIds: config.ticketCategoryIds,
};

client.once('ready', () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
  client.user.setActivity('Real RP Support', { type: 'WATCHING' });
});

// Comando /painel
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'painel') {
    const embed = new EmbedBuilder()
      .setColor('#FF0000') // Vermelho
      .setTitle('🎫 Real RP Support System')
      .setDescription('Bem-vindo ao sistema de suporte Real RP!\n\nClique nos botões abaixo para:\n• **Abrir um Ticket** - Para problemas técnicos\n• **Enviar Sugestão** - Para sugerir melhorias')
      .setFooter({ text: 'Real RP © 2024' });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('open_ticket')
          .setLabel('🎫 Abrir Ticket')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('suggest')
          .setLabel('💡 Enviar Sugestão')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: false });
  }

  if (interaction.commandName === 'setup') {
    const staffRole = interaction.options.getRole('staff_role');
    const adminRole = interaction.options.getRole('admin_role');
    const logChannel = interaction.options.getChannel('log_channel');
    const suggestionsChannel = interaction.options.getChannel('suggestions_channel');
    const ticketCategory = interaction.options.getChannel('ticket_category');

    guildConfig.staffRoleId = staffRole.id;
    guildConfig.adminRoleId = adminRole.id;
    guildConfig.logChannelId = logChannel.id;
    guildConfig.suggestionsChannelId = suggestionsChannel.id;
    guildConfig.ticketCategoryIds = [ticketCategory.id];

    const setupEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Setup Concluído')
      .addFields(
        { name: 'Staff Role', value: `<@&${staffRole.id}>`, inline: true },
        { name: 'Admin Role', value: `<@&${adminRole.id}>`, inline: true },
        { name: 'Log Channel', value: `<#${logChannel.id}>`, inline: true },
        { name: 'Suggestions Channel', value: `<#${suggestionsChannel.id}>`, inline: true },
        { name: 'Ticket Category', value: `${ticketCategory.name}`, inline: true }
      );

    await interaction.reply({ embeds: [setupEmbed], ephemeral: true });
  }
});

// Botões
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'open_ticket') {
    const modal = new ModalBuilder()
      .setCustomId('ticket_modal')
      .setTitle('Abrir Ticket');

    const titleInput = new TextInputBuilder()
      .setCustomId('ticket_title')
      .setLabel('Assunto do Ticket')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('ticket_description')
      .setLabel('Descrição do Problema')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descriptionInput)
    );

    await interaction.showModal(modal);
  }

  if (interaction.customId === 'suggest') {
    const modal = new ModalBuilder()
      .setCustomId('suggest_modal')
      .setTitle('Enviar Sugestão');

    const suggestionInput = new TextInputBuilder()
      .setCustomId('suggestion_text')
      .setLabel('Sua Sugestão')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(suggestionInput));

    await interaction.showModal(modal);
  }
});

// Modais
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  if (interaction.customId === 'ticket_modal') {
    const title = interaction.fields.getTextInputValue('ticket_title');
    const description = interaction.fields.getTextInputValue('ticket_description');

    const guild = interaction.guild;
    const categoryId = guildConfig.ticketCategoryIds[0];

    try {
      const channel = await guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: categoryId,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
          },
          {
            id: guildConfig.staffRoleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
          },
        ],
      });

      const ticketEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🎫 Novo Ticket')
        .addFields(
          { name: 'Autor', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Assunto', value: title, inline: false },
          { name: 'Descrição', value: description, inline: false }
        )
        .setFooter({ text: `Ticket ID: ${channel.id}` });

      const closeButton = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('❌ Fechar Ticket')
            .setStyle(ButtonStyle.Danger)
        );

      await channel.send({ embeds: [ticketEmbed], components: [closeButton] });

      const logChannel = guild.channels.cache.get(guildConfig.logChannelId);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor('#0099FF')
          .setTitle('📋 Log: Novo Ticket')
          .addFields(
            { name: 'Usuário', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Canal', value: `<#${channel.id}>`, inline: true },
            { name: 'Assunto', value: title, inline: false }
          );
        await logChannel.send({ embeds: [logEmbed] });
      }

      await interaction.reply({ content: `✅ Ticket criado: <#${channel.id}>`, ephemeral: true });
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      await interaction.reply({ content: '❌ Erro ao criar ticket', ephemeral: true });
    }
  }

  if (interaction.customId === 'suggest_modal') {
    const suggestion = interaction.fields.getTextInputValue('suggestion_text');

    const suggestEmbed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('💡 Nova Sugestão')
      .addFields(
        { name: 'Autor', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Status', value: '⏳ Em Análise', inline: true },
        { name: 'Sugestão', value: suggestion, inline: false }
      )
      .setTimestamp();

    const suggestionsChannel = interaction.guild.channels.cache.get(guildConfig.suggestionsChannelId);
    if (suggestionsChannel) {
      await suggestionsChannel.send({ embeds: [suggestEmbed] });
    }

    await interaction.reply({ content: '✅ Sugestão enviada com sucesso!', ephemeral: true });
  }
});

// Botão para fechar ticket
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'close_ticket') {
    const channel = interaction.channel;

    const closeEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🎫 Ticket Fechado')
      .setDescription(`Este ticket foi fechado por <@${interaction.user.id}>`)
      .setTimestamp();

    await channel.send({ embeds: [closeEmbed] });

    setTimeout(async () => {
      try {
        await channel.delete();
      } catch (error) {
        console.error('Erro ao deletar canal:', error);
      }
    }, 3000);
  }
});

client.login(config.token);
