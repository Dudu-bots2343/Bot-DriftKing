// ====================== KEEP ALIVE ======================
import express from "express";
const app = express();

app.get("/", (req, res) => res.send("Bot ativo e rodando 24h! 🚀"));

app.listen(3000, () => console.log("🌐 KeepAlive ativo na porta 3000!"));

// ====================== DOTENV ==========================
import dotenv from "dotenv";
dotenv.config();

// ====================== JSON RANKING ===================
import fs from "fs";

let ranking = {};
try {
  ranking = JSON.parse(fs.readFileSync("recrutadores.json", "utf8"));
} catch (err) {
  console.log("Arquivo recrutadores.json não encontrado, criando um novo...");
  fs.writeFileSync("recrutadores.json", JSON.stringify(ranking, null, 2));
}

function salvarRanking() {
  fs.writeFileSync("recrutadores.json", JSON.stringify(ranking, null, 2));
}

// ====================== DISCORD.JS =====================
import {
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
} from "discord.js";

import { joinVoiceChannel, createAudioPlayer, createAudioResource } from "@discordjs/voice";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ====================== VARIÁVEIS DO .ENV ==============
const CANAL_PEDIR_SET = process.env.CANAL_PEDIR_SET;
const CANAL_ACEITA_SET = process.env.CANAL_ACEITA_SET;
const CARGO_APROVADO = process.env.CARGO_APROVADO;
const CARGO_APROVADO_2 = process.env.CARGO_APROVADO_2;
const CALL_24H = process.env.CALL_24H;
const TOKEN = process.env.TOKEN;

// ====================== BOT ONLINE ======================
client.on("ready", async () => {
  console.log(`🤖 Bot ligado como ${client.user.tag}`);

  // Mensagem de registro
  try {
    const canal = await client.channels.fetch(CANAL_PEDIR_SET);
    if (!canal) throw new Error("Canal de registro não encontrado ou sem permissão");

    const embed = new EmbedBuilder()
      .setTitle("Sistema Família DriftKing ")
      .setDescription("Registro A7.\n\n Solicite SET usando o botão abaixo.\nPreencha com atenção!")
      .addFields({
        name: "📌 Lembretes",
        value: "• A resenha aqui é garantida.\n• Não leve tudo a sério.",
      })
      .setColor("#f1c40f");

    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("abrirRegistro")
        .setLabel("Registro")
        .setStyle(ButtonStyle.Primary)
    );

    await canal.send({ embeds: [embed], components: [btn] });
    console.log("📩 Mensagem de registro enviada!");
  } catch (err) {
    console.log("❌ Erro ao enviar mensagem de registro:", err.message);
  }

  // Conectar no canal de voz 24h
  try {
    const canalVoz = await client.channels.fetch(CALL_24H);
    if (!canalVoz) throw new Error("Canal de voz 24h não encontrado ou sem permissão");

    const conexao = joinVoiceChannel({
      channelId: canalVoz.id,
      guildId: canalVoz.guild.id,
      adapterCreator: canalVoz.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    const player = createAudioPlayer();
    const resource = createAudioResource("silencio.mp3");
    player.play(resource);
    conexao.subscribe(player);

    console.log("🔊 Bot conectado no canal de voz 24h!");
  } catch (err) {
    console.log("❌ Erro ao conectar no canal de voz 24h:", err.message);
  }
});

// ====================== ABRIR MODAL =====================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "abrirRegistro") return;

  const modal = new ModalBuilder().setCustomId("modalRegistro").setTitle("Solicitação de Set");

  const nome = new TextInputBuilder().setCustomId("nome").setLabel("Seu nome*").setRequired(true).setStyle(TextInputStyle.Short);
  const id = new TextInputBuilder().setCustomId("iduser").setLabel("Seu ID *").setRequired(true).setStyle(TextInputStyle.Short);
  const recrutador = new TextInputBuilder().setCustomId("recrutador").setLabel("Nome de quem te recrutou *").setRequired(true).setStyle(TextInputStyle.Short);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nome),
    new ActionRowBuilder().addComponents(id),
    new ActionRowBuilder().addComponents(recrutador)
  );

  await interaction.showModal(modal);
});

// ====================== RECEBER FORM =====================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== "modalRegistro") return;

  const nome = interaction.fields.getTextInputValue("nome");
  const iduser = interaction.fields.getTextInputValue("iduser");
  const recrutador = interaction.fields.getTextInputValue("recrutador");

  const recrutadores = { "lm": "LM", "a7": "A7", "dk": "DriftKing", "m4": "M4" };
  const recrutadorOficial = recrutadores[recrutador.trim().toLowerCase()] || recrutador;

  try {
    const canal = await client.channels.fetch(CANAL_ACEITA_SET);
    if (!canal) throw new Error("Canal de aprovação não encontrado ou sem permissão");

    const embed = new EmbedBuilder()
      .setTitle("Novo Pedido de Registro")
      .setColor("#3498db")
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: "Usuário", value: `${interaction.user}` },
        { name: "Nome Informado", value: nome },
        { name: "ID Informado", value: iduser },
        { name: "Recrutador", value: recrutadorOficial },
        { name: "Conta Criada em", value: `<t:${Math.floor(interaction.user.createdTimestamp / 1000)}:R>` }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}`).setLabel("Aprovar").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`negar_${interaction.user.id}`).setLabel("Negar").setStyle(ButtonStyle.Danger)
    );

    await canal.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: "Seu pedido foi enviado!", ephemeral: true });

  } catch (err) {
    console.log("❌ Erro ao enviar registro:", err.message);
    await interaction.reply({ content: "❌ Não foi possível enviar o pedido, fale com um administrador.", ephemeral: true });
  }
});

// =================== APROVAR / NEGAR ====================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  const [acao, userId] = interaction.customId.split("_");
  if (!["aprovar", "negar"].includes(acao)) return;

  try {
    const membro = await interaction.guild.members.fetch(userId);
    const embedOriginal = interaction.message.embeds[0];
    const nomeInformado = embedOriginal.fields.find(f => f.name === "Nome Informado")?.value;
    const idInformado = embedOriginal.fields.find(f => f.name === "ID Informado")?.value;
    const recrutadorOficial = embedOriginal.fields.find(f => f.name === "Recrutador")?.value;

    if (acao === "aprovar") {
      await membro.setNickname(`M | ${nomeInformado} | ${idInformado}`);
      await membro.roles.add([CARGO_APROVADO, CARGO_APROVADO_2]);

      // ======== RANKING ========
      const hoje = new Date();
      const dia = hoje.toISOString().split("T")[0];
      const semana = `W${Math.ceil(hoje.getUTCDate() / 7)}-${hoje.getUTCFullYear()}`;
      const mes = `${hoje.getMonth() + 1}-${hoje.getFullYear()}`;
      const ano = `${hoje.getFullYear()}`;

      function addRank(tipo, chave, quem) {
        if (!ranking[tipo]) ranking[tipo] = {};
        if (!ranking[tipo][chave]) ranking[tipo][chave] = {};
        ranking[tipo][chave][quem] = (ranking[tipo][chave][quem] || 0) + 1;
      }

      addRank("dia", dia, recrutadorOficial);
      addRank("semana", semana, recrutadorOficial);
      addRank("mes", mes, recrutadorOficial);
      addRank("ano", ano, recrutadorOficial);
      salvarRanking();

      const embedAprovado = new EmbedBuilder()
        .setColor("Green")
        .setTitle("Registro Aprovado")
        .addFields(
          { name: "👤 Usuário:", value: `${membro}` },
          { name: "🪪 ID:", value: `${idInformado}` },
          { name: "📛 Nome Setado:", value: `M | ${nomeInformado} | ${idInformado}` },
          { name: "🧭 Acesso aprovado por:", value: `${interaction.user}` }
        )
        .setThumbnail(membro.user.displayAvatarURL())
        .setFooter({ text: "Aprovado com sucesso!" });

      await interaction.update({ embeds: [embedAprovado], components: [] });
      await membro.send("✨ **Parabéns! Agora você é um membro oficial da Family DriftKing!**").catch(() => {});

    } else if (acao === "negar") {
      await membro.kick("Registro negado pelo aprovador.");
      const embedNegado = new EmbedBuilder()
        .setColor("Red")
        .setTitle("Registro Negado")
        .setDescription(`❌ O usuário **${membro.user.tag}** foi expulso.\nNegado por: ${interaction.user}`)
        .setThumbnail(membro.user.displayAvatarURL());

      await interaction.update({ embeds: [embedNegado], components: [] });
    }

  } catch (err) {
    console.log("❌ Erro ao processar aprovação/negação:", err.message);
    await interaction.reply({ content: "❌ Não foi possível processar a ação.", ephemeral: true });
  }
});

// ==================== COMANDO RANKING ===================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "ranking") return;

  const tipo = interaction.options.getString("periodo");
  if (!ranking[tipo]) return interaction.reply({ content: "Nenhum registro encontrado.", ephemeral: true });

  const chaves = Object.keys(ranking[tipo]).sort().reverse();
  const ultima = ranking[tipo][chaves[0]];

  const texto = Object.entries(ultima)
    .sort((a,b) => b[1]-a[1])
    .map(([nome,qtd],i) => `${i+1}. **${nome}** — ${qtd} recrutamentos`)
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle(`🏆 Ranking de Recrutadores (${tipo.toUpperCase()})`)
    .setColor("Gold")
    .setDescription(texto);

  return interaction.reply({ embeds: [embed] });
});

client.login(TOKEN);
