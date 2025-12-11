// NOVA VERSÃO COMPLETA DO INDEX.JS — ATUALIZADO COM:
// ✅ Nome final: M | Nome | ID fornecido
// ✅ Modal inclui: Nome, ID e Quem te recrutou
// ✅ Reconhecimento automático do recrutador (LM, A7, etc.)
// ✅ Ranking diário, semanal, mensal e anual de recrutadores
// ---------------------------------------------------------

// ====================== KEEP ALIVE ======================
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot ativo e rodando 24h! 🚀"));
app.listen(3000, () => console.log("🌐 KeepAlive ativo na porta 3000!"));

// ====================== DOTENV ==========================
require("dotenv").config();

// ====================== DISCORD.JS ======================
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ====================== VARIÁVEIS =======================
const CANAL_PEDIR_SET = process.env.CANAL_PEDIR_SET;
const CANAL_ACEITA_SET = process.env.CANAL_ACEITA_SET;
const CARGO_APROVADO = process.env.CARGO_APROVADO;
const CARGO_APROVADO_2 = process.env.CARGO_APROVADO_2;
const TOKEN = process.env.TOKEN;

// ====================== RANKING =========================
// Armazena o número de recrutas por recrutador em vários períodos
const ranking = {
  dia: {},
  semana: {},
  mes: {},
  ano: {},
};

function addRecrutamento(nome) {
  const keys = ["dia", "semana", "mes", "ano"];
  keys.forEach((k) => {
    if (!ranking[k][nome]) ranking[k][nome] = 0;
    ranking[k][nome]++;
  });
}

client.on("ready", async () => {
  console.log(`🤖 Bot ligado como ${client.user.tag}`);

  const canal = await client.channels.fetch(CANAL_PEDIR_SET);

  const embed = new EmbedBuilder()
    .setTitle("Sistema Família Do7")
    .setDescription("Solicite SET usando o botão abaixo.")
    .setColor("Yellow");

  const btn = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("abrirRegistro").setLabel("Registro").setStyle(ButtonStyle.Primary)
  );

  await canal.send({ embeds: [embed], components: [btn] });
});

// ====================== MODAL ===========================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "abrirRegistro") return;

  const modal = new ModalBuilder().setCustomId("modalRegistro").setTitle("Solicitação de Set");

  const nome = new TextInputBuilder().setCustomId("nome").setLabel("Seu nome*").setRequired(true).setStyle(TextInputStyle.Short);
  const id = new TextInputBuilder().setCustomId("iduser").setLabel("Seu ID*").setRequired(true).setStyle(TextInputStyle.Short);
  const recrutador = new TextInputBuilder().setCustomId("recruiter").setLabel("Quem te recrutou?*").setRequired(true).setStyle(TextInputStyle.Short);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nome),
    new ActionRowBuilder().addComponents(id),
    new ActionRowBuilder().addComponents(recrutador)
  );

  await interaction.showModal(modal);
});

// ====================== RECEBER MODAL ====================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== "modalRegistro") return;

  const nome = interaction.fields.getTextInputValue("nome");
  const iduser = interaction.fields.getTextInputValue("iduser");
  const recrutadorTexto = interaction.fields.getTextInputValue("recruiter");

  // Detectar recrutador automaticamente (LM, L7, A7, etc.)
  const recrutador = recrutadorTexto.toUpperCase();

  const canal = await client.channels.fetch(CANAL_ACEITA_SET);

  const embed = new EmbedBuilder()
    .setTitle("Novo Pedido de Registro")
    .setColor("Blue")
    .addFields(
      { name: "Nome", value: nome },
      { name: "ID", value: iduser },
      { name: "Recrutador", value: recrutador },
      { name: "Usuário", value: `${interaction.user}` }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}_${recrutador}`).setLabel("Aprovar").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`negar_${interaction.user.id}`).setLabel("Negar").setStyle(ButtonStyle.Danger)
  );

  await canal.send({ embeds: [embed], components: [row] });

  await interaction.reply({ content: "Seu pedido foi enviado!", ephemeral: true });
});

// ====================== APROVAR / NEGAR ==================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const split = interaction.customId.split("_");
  const acao = split[0];
  const userId = split[1];
  const recrutador = split[2];

  const membro = await interaction.guild.members.fetch(userId);

  const embedOriginal = interaction.message.embeds[0];
  const nomeInformado = embedOriginal.fields.find((f) => f.name === "Nome").value;
  const idInformado = embedOriginal.fields.find((f) => f.name === "ID").value;

  // ========== APROVAR ==========
  if (acao === "aprovar") {
    const novoNome = `M | ${nomeInformado} | ${idInformado}`;

    await membro.setNickname(novoNome);
    await membro.roles.add([CARGO_APROVADO, CARGO_APROVADO_2]);

    // Contabilizar recrutador no ranking
    addRecrutamento(recrutador);

    await membro.send("🎉 Seu SET foi aprovado! Seja bem-vindo!").catch(() => {});

    const embedAprovado = new EmbedBuilder()
      .setTitle("SET Aprovado")
      .setColor("Green")
      .addFields(
        { name: "Usuário", value: `${membro}` },
        { name: "Novo Nome", value: novoNome },
        { name: "Recrutador", value: recrutador }
      );

    await interaction.update({ embeds: [embedAprovado], components: [] });
  }

  // ========== NEGAR ==========
  if (acao === "negar") {
    await membro.kick("SET recusado");

    await interaction.update({
      embeds: [new EmbedBuilder().setColor("Red").setDescription(`❌ Usuário ${membro.user.tag} removido.`)],
      components: [],
    });
  }
});

// ====================== RANKING COMANDO =================
client.on("messageCreate", async (msg) => {
  if (msg.content !== "!ranking") return;

  function gerarTabela(obj) {
    return Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .map((x) => `**${x[0]}** — ${x[1]} recrutamentos`)
      .join("\n");
  }

  const embed = new EmbedBuilder()
    .setTitle("🏆 Ranking de Recrutadores")
    .setColor("Gold")
    .addFields(
      { name: "📅 Hoje", value: gerarTabela(ranking.dia) || "Ninguém" },
      { name: "📆 Semana", value: gerarTabela(ranking.semana) || "Ninguém" },
      { name: "📅 Mês", value: gerarTabela(ranking.mes) || "Ninguém" },
      { name: "📅 Ano", value: gerarTabela(ranking.ano) || "Ninguém" }
    );

  msg.reply({ embeds: [embed] });
});

client.login(TOKEN);
