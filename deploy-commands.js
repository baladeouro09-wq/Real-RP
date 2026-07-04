const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

// Carrega configuração do config.json ou variáveis de ambiente
let token, applicationId, guildId;

if (fs.existsSync('./config.json')) {
  const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  token = process.env.DISCORD_TOKEN || config.token;
  applicationId = process.env.APPLICATION_ID || config.applicationId;
  guildId = process.env.GUILD_ID || config.guildId;
} else {
  token = process.env.DISCORD_TOKEN;
  applicationId = process.env.APPLICATION_ID;
  guildId = process.env.GUILD_ID;
}

const commands = [
  new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Envia o painel de tickets e sugestões no canal atual')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configura os IDs de cargo e canal do bot')
    .addRoleOption(option =>
      option.setName('staff_role').setDescription('Cargo de Staff').setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('admin_role').setDescription('Cargo de Admin').setRequired(true)
    )
    .addChannelOption(option =>
      option.setName('log_channel').setDescription('Canal de logs').setRequired(true)
    )
    .addChannelOption(option =>
      option.setName('suggestions_channel').setDescription('Canal de sugestões').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('ticket_category').setDescription('Nome ou ID da categoria de tickets').setRequired(true)
    )
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('🔄 Registrando comandos de barra...');

    await rest.put(
      Routes.applicationGuildCommands(applicationId, guildId),
      { body: commands }
    );

    console.log('✅ Comandos registrados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao registrar comandos:', error);
  }
})();
