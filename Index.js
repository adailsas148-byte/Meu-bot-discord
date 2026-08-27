const { 
  Client, GatewayIntentBits, Partials, REST, Routes, 
  Events, EmbedBuilder, PermissionFlagsBits, ModalBuilder, 
  ActionRowBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder,
  ButtonBuilder, ButtonStyle, ChannelType, SlashCommandBuilder, Collection
} = require('discord.js');

// =========================================================
// ⚙️ CONFIGURAÇÕES PRINCIPAIS (TOKENS E IDS DOS CANAIS)
// =========================================================
const TOKEN_UPS = 'MTU0MjA3ODg0ODA2NDAyODc5Mw.G4DGXX._qza1RQ8e0ITundW3-UnF6QdVGUbbfoZ0qO7Yc';
const TOKEN_COMMUNITY = 'MTU0MjA0MTcwNTc4NjkwMDU1MA.G7FXAn.M1EAVek-l-6G7vig6OPEzjI6Vu1KiRGlIkP-Aw';

// 📌 IDS DOS CANAIS
const CANAL_BOAS_VINDAS_ID = '1541954555967963216';

// =========================================================
// CONFIGURAÇÃO DOS CLIENTS
// =========================================================
const clientOptions = {
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites, // 👈 INTENT OBRIGATÓRIO PARA CONVITES
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
};

const botUPS = new Client(clientOptions);
const botCommunity = new Client(clientOptions);

// 📦 CACHE GLOBAL PARA RASTREAR OS USOS DOS CONVITES
const invitesCache = new Collection();

// =========================================================
// BOT 1: VZ UPS (Tabela + Ticket de UP)
// =========================================================
botUPS.once(Events.ClientReady, async () => {
  console.log(`✨ VZ UPS online como: ${botUPS.user.tag}`);
  botUPS.user.setPresence({ activities: [{ name: 'VZ COMMUNITY | Solicitar UP 🪐' }], status: 'online' });

  try {
    const rest = new REST({ version: '10' }).setToken(TOKEN_UPS);
    await rest.put(Routes.applicationCommands(botUPS.user.id), {
      body: [
        new SlashCommandBuilder()
          .setName('enviar-up')
          .setDescription('Envia o Painel de Tabela e Tickets de UP')
          .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      ]
    });
    console.log('✅ Comando /enviar-up registrado no VZ UPS!');
  } catch (error) {
    console.error('❌ Erro no registro de comandos VZ UPS:', error);
  }
});

botUPS.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'enviar-up') {
      const upEmbed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle('🪙 VZ COMMUNITY — PAINEL DE UP')
        .setDescription('📋 **SOLICITAR UP | VZ COMMUNITY**\n\n• Selecione uma categoria abaixo para solicitar seu UP.')
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

      const menu = new StringSelectMenuBuilder()
        .setCustomId('select_up_category')
        .setPlaceholder('Solicitar UP...')
        .addOptions([
          { label: 'Combate', value: 'Combate', emoji: '⚔️' },
          { label: 'Espadas', value: 'Espadas', emoji: '🗡️' },
          { label: 'Armas', value: 'Armas', emoji: '🔫' },
          { label: 'Raças', value: 'Racas', emoji: '👹' },
          { label: 'Raças V4 / Gears', value: 'Racas V4', emoji: '🌌' },
          { label: 'Leviathan', value: 'Leviathan', emoji: '🐳' },
          { label: 'Itens / Level / Belly', value: 'Itens', emoji: '🎒' }
        ]);

      await interaction.channel.send({ embeds: [upEmbed], components: [new ActionRowBuilder().addComponents(menu)] });
      return interaction.reply({ content: '✅ Painel de UP enviado!', ephemeral: true });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'select_up_category') {
      const modal = new ModalBuilder().setCustomId(`modal_up_${interaction.values[0]}`).setTitle(`Solicitar UP - ${interaction.values[0]}`);
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item').setLabel('Qual UP você quer?').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('status').setLabel('Seu Level / Status').setStyle(TextInputStyle.Short).setRequired(true))
      );
      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_up_')) {
      await interaction.deferReply({ ephemeral: true });
      const cat = interaction.customId.replace('modal_up_', '');
      const item = interaction.fields.getTextInputValue('item');
      const status = interaction.fields.getTextInputValue('status');

      const ch = await interaction.guild.channels.create({
        name: `up-${interaction.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          { id: botUPS.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
        ]
      });

      const embed = new EmbedBuilder().setColor(0x10B981).setTitle(`🛒 UP SOLICITADO — ${cat}`).setDescription(`👤 **Cliente:** ${interaction.user}\n📦 **Item:** ${item}\n📊 **Status:** ${status}`);
      const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket 🔒').setStyle(ButtonStyle.Danger));
      await ch.send({ embeds: [embed], components: [btn] });
      return interaction.editReply({ content: `✅ Ticket de UP criado: ${ch}` });
    }

    if (interaction.isButton() && interaction.customId === 'fechar_ticket') {
      await interaction.reply('🔒 Encerrando ticket...');
      setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
    }
  } catch (e) { console.error(e); }
});


// =========================================================
// BOT 2: VZ COMMUNITY! (Boas-vindas + Sistema de Convites)
// =========================================================
botCommunity.once(Events.ClientReady, async () => {
  console.log(`✨ VZ COMMUNITY online como: ${botCommunity.user.tag}`);
  botCommunity.user.setPresence({ activities: [{ name: 'Atendimento VZ COMMUNITY 🚀' }], status: 'online' });

  // 1️⃣ CARREGA TODOS OS CONVITES EXISTENTES NO CACHE AO INICIAR
  for (const [guildId, guild] of botCommunity.guilds.cache) {
    try {
      const guildInvites = await guild.invites.fetch();
      invitesCache.set(guildId, new Collection(guildInvites.map(inv => [inv.code, inv.uses])));
    } catch (err) {
      console.log(`⚠️ Não foi possível carregar convites de ${guild.name}:`, err.message);
    }
  }

  try {
    const rest = new REST({ version: '10' }).setToken(TOKEN_COMMUNITY);

    const commands = [
      new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Envia a Central de Atendimento & Suporte')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

      new SlashCommandBuilder()
        .setName('mensagem')
        .setDescription('Envia uma mensagem oficial/anúncio personalizada em Embed')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt => opt.setName('mensagem').setDescription('O conteúdo principal').setRequired(true))
        .addStringOption(opt => opt.setName('titulo').setDescription('Título do aviso (opcional)').setRequired(false))
        .addStringOption(opt => opt.setName('cor').setDescription('Cor Hex (Ex: #8B5CF6)').setRequired(false)),

      new SlashCommandBuilder()
        .setName('boas-vindas')
        .setDescription('Envia manualmente a mensagem de boas-vindas no canal')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

      // 📌 COMANDO DE CONSULTA DE CONVITES
      new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Mostra a quantidade de convites de um membro')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuário para checar convites').setRequired(false))
    ];

    await rest.put(Routes.applicationCommands(botCommunity.user.id), { body: commands });
    console.log('✅ Comandos registrados no VZ COMMUNITY!');
  } catch (error) {
    console.error('❌ Erro no registro de comandos VZ COMMUNITY:', error);
  }
});

// 2️⃣ ATUALIZA CACHE QUANDO UM NOVO CONVITE É CRIADO OU DELETADO
botCommunity.on(Events.InviteCreate, async invite => {
  const guildInvites = invitesCache.get(invite.guild.id) || new Collection();
  guildInvites.set(invite.code, invite.uses);
  invitesCache.set(invite.guild.id, guildInvites);
});

botCommunity.on(Events.InviteDelete, async invite => {
  const guildInvites = invitesCache.get(invite.guild.id);
  if (guildInvites) {
    guildInvites.delete(invite.code);
  }
});

// 3️⃣ RASTREIA QUEM CONVIDOU O NOVO MEMBRO
botCommunity.on(Events.GuildMemberAdd, async member => {
  try {
    const canal = member.guild.channels.cache.get(CANAL_BOAS_VINDAS_ID);
    if (!canal) return console.log('❌ Canal de boas-vindas não encontrado. Verifique o ID configurado.');

    const newInvites = await member.guild.invites.fetch().catch(() => null);
    const oldInvites = invitesCache.get(member.guild.id);

    let inviterUser = 'Desconhecido / Link Direto';
    let inviteUses = 0;

    // Compara a quantidade de usos anterior com a atual para descobrir quem convidou
    if (newInvites && oldInvites) {
      const usedInvite = newInvites.find(inv => {
        const prevUses = oldInvites.get(inv.code) || 0;
        return inv.uses > prevUses;
      });

      if (usedInvite && usedInvite.inviter) {
        inviterUser = `${usedInvite.inviter}`;
        inviteUses = usedInvite.uses;
      }

      // Atualiza o cache do servidor
      invitesCache.set(member.guild.id, new Collection(newInvites.map(inv => [inv.code, inv.uses])));
    }

    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle(`Bem-vindo(a) à VZ Community, ${member.user.username}!`)
      .setDescription(
        `Seja muito bem-vindo(a) à VZ Community, ${member}! 🖤\n\n` +
        'É um prazer ter você aqui com a gente.\n\n' +
        '📌 **Antes de começar:** leia as regras para entender como tudo funciona.\n\n' +
        '🤝 **Respeito em primeiro lugar:** trate todos os membros com respeito.\n\n' +
        'Seja oficialmente bem-vindo(a) à VZ Community. 🖤'
      )
      .addFields(
        { name: '👤 Novo Membro:', value: `${member} (${member.user.tag})`, inline: true },
        { name: '📩 Convidado por:', value: `${inviterUser}`, inline: true },
        { name: '📊 Uso deste link:', value: inviteUses > 0 ? `\`${inviteUses}\` vezes` : '`N/A`', inline: true }
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'VZ COMMUNITY • Sistema de Convites', iconURL: member.guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    await canal.send({ content: `👋 ${member} entrou no servidor! Convidado por: ${inviterUser}`, embeds: [welcomeEmbed] });
  } catch (err) {
    console.error('❌ Erro no envio de boas-vindas:', err);
  }
});

// INTERAÇÕES E COMANDOS DO BOT COMMUNITY
botCommunity.on(Events.InteractionCreate, async interaction => {
  try {
    // COMANDO /INVITES
    if (interaction.isChatInputCommand() && interaction.commandName === 'invites') {
      const targetUser = interaction.options.getUser('usuario') || interaction.user;
      const guildInvites = await interaction.guild.invites.fetch().catch(() => null);

      if (!guildInvites) {
        return interaction.reply({ content: '❌ Não tenho permissão para ver os convites do servidor.', ephemeral: true });
      }

      const userInvites = guildInvites.filter(inv => inv.inviter && inv.inviter.id === targetUser.id);
      const totalUses = userInvites.reduce((acc, inv) => acc + inv.uses, 0);

      const embedInvites = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle(`📊 Convites de ${targetUser.username}`)
        .setDescription(`👤 **Membro:** ${targetUser}\n📈 **Total de Pessoas Convidadas:** \`${totalUses}\` membros`)
        .setFooter({ text: 'VZ COMMUNITY • Rastreador de Convites' });

      return interaction.reply({ embeds: [embedInvites] });
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'boas-vindas') {
      const welcomeEmbed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle('Bem-vindo à VZ Community')
        .setDescription('Seja muito bem-vindo à VZ Community! 🖤')
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setFooter({ text: 'VZ COMMUNITY • Comunicação Oficial' });

      await interaction.channel.send({ embeds: [welcomeEmbed] });
      return interaction.reply({ content: '✅ Mensagem enviada!', ephemeral: true });
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'mensagem') {
      const texto = interaction.options.getString('mensagem');
      const titulo = interaction.options.getString('titulo');
      const corHex = interaction.options.getString('cor') || '#8B5CF6';

      let colorCode = 0x8B5CF6;
      try {
        if (corHex.startsWith('#')) {
          colorCode = parseInt(corHex.replace('#', ''), 16);
        }
      } catch (e) {
        colorCode = 0x8B5CF6;
      }

      const embedMsg = new EmbedBuilder()
        .setColor(colorCode)
        .setDescription(texto.replace(/\\n/g, '\n'))
        .setFooter({ text: 'VZ COMMUNITY • Comunicação Oficial', iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      if (titulo) embedMsg.setTitle(titulo);

      await interaction.channel.send({ embeds: [embedMsg] });
      return interaction.reply({ content: '📢 Mensagem enviada!', ephemeral: true });
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'ticket') {
      const suporteEmbed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle('✦ CENTRAL DE ATENDIMENTO & SUPORTE')
        .setDescription('Selecione a opção desejada no menu abaixo para abrir um ticket.')
        .setFooter({ text: 'Atendimento Rápido • Sistema Oficial' });

      const menuSuporte = new StringSelectMenuBuilder()
        .setCustomId('select_suporte_category')
        .setPlaceholder('✨ Escolha a categoria...')
        .addOptions([
          { label: 'Ocorrência / Relatar Caso', value: 'Ocorrencia', emoji: '🚨' },
          { label: 'Financeiro / Pagamento', value: 'Financeiro', emoji: '💳' },
          { label: 'Reivindicar Recompensa', value: 'Recompensa', emoji: '🎁' }
        ]);

      await interaction.channel.send({ embeds: [suporteEmbed], components: [new ActionRowBuilder().addComponents(menuSuporte)] });
      return interaction.reply({ content: '✅ Painel enviado!', ephemeral: true });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'select_suporte_category') {
      const categoria = interaction.values[0];
      const modal = new ModalBuilder().setCustomId(`modal_suporte_${categoria}`).setTitle(`Atendimento - ${categoria}`);
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('assunto').setLabel('Assunto').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('detalhes').setLabel('Detalhes').setStyle(TextInputStyle.Paragraph).setRequired(true))
      );
      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_suporte_')) {
      await interaction.deferReply({ ephemeral: true });

      const cat = interaction.customId.replace('modal_suporte_', '');
      const assunto = interaction.fields.getTextInputValue('assunto');
      const detalhes = interaction.fields.getTextInputValue('detalhes');

      const ticketChannel = await interaction.guild.channels.create({
        name: `suporte-${interaction.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
          { id: botCommunity.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
        ]
      });

      const ticketEmbed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle(`📩 TICKET DE SUPORTE — ${cat.toUpperCase()}`)
        .setDescription(`👤 **Autor:** ${interaction.user}\n📌 **Assunto:** ${assunto}\n📝 **Detalhes:** ${detalhes}`)
        .setTimestamp();

      const btnFechar = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('fechar_suporte_ticket').setLabel('Fechar Ticket 🔒').setStyle(ButtonStyle.Danger)
      );

      await ticketChannel.send({ content: `${interaction.user} | Ticket criado!`, embeds: [ticketEmbed], components: [btnFechar] });
      return interaction.editReply({ content: `✅ Ticket de Suporte criado: ${ticketChannel}` });
    }

    if (interaction.isButton() && interaction.customId === 'fechar_suporte_ticket') {
      await interaction.reply('🔒 Encerrando atendimento...');
      setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
    }

  } catch (err) {
    console.error('❌ Erro no VZ COMMUNITY:', err);
  }
});

// Login nos 2 Bots
botUPS.login(TOKEN_UPS).catch(err => console.error('❌ Erro de login botUPS:', err.message));
botCommunity.login(TOKEN_COMMUNITY).catch(err => console.error('❌ Erro de login botCommunity:', err.message));
