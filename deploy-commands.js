const { REST, Routes, SlashCommandBuilder, ChannelType } = require('discord.js');
const config = require('./config.json');
const commands = [
  new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Envia o painel completo de Tickets e Sugestões do Real RP'),
  new SlashCommandBuilder()
    .setName('painel_tickets')
    .setDescription('Envia apenas o painel de Tickets do Real RP'),
  new SlashCommandBuilder()
    .setName('painel_sugestoes')
    .setDescription('Envia apenas o painel de Sugestões do Real RP'),
  new SlashCommandBuilder()
    .setName('sugestao')
    .setDescription('Envia uma sugestão diretamente para o canal de sugestões')
    .addStringOption(option =>
      option.setName('titulo')
        .setDescription('Título da sugestão')
        .setRequired(true),
    )
    .addStringOption(option =>
      option.setName('descricao')
        .setDescription('Descrição detalhada da sugestão')
        .setRequired(true),
    )
    .addStringOption(option =>
      option.setName('categoria')
        .setDescription('Categoria da sugestão')
        .setRequired(true)
        .addChoices(
          { name: 'Servidor', value: 'servidor' },
          { name: 'Economia', value: 'economia' },
          { name: 'Polícia', value: 'policia' },
          { name: 'Staff', value: 'staff' },
          { name: 'Eventos', value: 'eventos' },
          { name: 'Outros', value: 'outros' },
        ),
    ),
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configura os canais e roles do sistema de tickets e sugestões')
    .addRoleOption(option =>
      option.setName('staff_role')
        .setDescription('Cargo de staff que pode gerir tickets e sugestões')
        .setRequired(true),
    )
    .addRoleOption(option =>
      option.setName('admin_role')
        .setDescription('Cargo de administrador com acesso total')
        .setRequired(true),
    )
    .addChannelOption(option =>
      option.setName('log_channel')
        .setDescription('Canal de logs do sistema')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText),
    )
    .addChannelOption(option =>
      option.setName('suggestions_channel')
        .setDescription('Canal onde sugestões serão publicadas')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText),
    )
    .addChannelOption(option =>
      option.setName('ticket_category')
        .setDescription('Categoria onde os tickets serão criados')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildCategory),
    ),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log('Registrando comandos...');
    await rest.put(Routes.applicationGuildCommands(config.applicationId, config.guildId), {
      body: commands,
    });
    console.log('Comandos registrados com sucesso.');
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
  }
})();
