const { Client, IntentsBitField, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder  } = require("discord.js");
const mongoose = require("mongoose");
const axios = require('axios');
const colors = require('colors');
const Groq = require('groq-sdk');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');
const lyricsFinder = require('lyrics-finder')

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildVoiceStates,
    ],
});
const songsData = JSON.parse(fs.readFileSync('songs.json', 'utf8'));
const songs = songsData.songs;

const userPoints = {};
let usedSongs = [];
let isActive = false;
const groq = new Groq({ apiKey: "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" });
registerFont(path.join(__dirname, 'BebasNeue-Regular.ttf'), { family: 'Bebas Neue' });
const dbURI = "mongodb+srv://Asteral:IAMASWIFTIEGURL@cluster0.ohlpp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(dbURI)
    .then(() => console.log("Connected to MongoDB".yellow))
    .catch((err) => console.error("Failed to connect the MongoDB", err));
const afkSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    afkMessage: { type: String, required: true },
});
const Afk = mongoose.model("Afk", afkSchema);
const deletedMessageSchema = new mongoose.Schema({
    guildId: String,
    channelId: String,
    content: String,
    authorTag: String,
    timestamp: Date,
    deletedBy: String
});
const DeletedMessage = mongoose.model('DeletedMessage', deletedMessageSchema);

const FormSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  answers: [String],
});
const Form = mongoose.model("Form", FormSchema);
let cooldowns = new Map();
const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'bot'], required: true },
  content: { type: String, required: true }
});

const conversationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  messages: { type: [messageSchema], required: true }
});
const Conversation = mongoose.model('Conversation', conversationSchema);

client.setMaxListeners(20);
// Error Reporter
const webhookURL = 'https://discord.com/api/webhooks/1306653055734911046/drIzalNkabrbh1zlmoXXrUzkz_1oa0GXA0RiLLfS1ePcKs7LfOQMAWnqkWFIQyVC51Ou';

async function sendErrorToWebhook(error) {
    try {
        const embed = new EmbedBuilder()
            .setTitle('Error Occurred in Discord Bot')
            .setColor(0xff0000)
            .addFields([
                { name: 'Error Message', value: error.message || 'No message provided' },
                { name: 'Stack Trace', value: `\`\`\`js\n${error.stack}\n\`\`\`` },
                { name: 'Timestamp', value: new Date().toISOString() },
            ]);

        await axios.post(webhookURL, {
            content: 'An error occurred in the bot!',
            embeds: [embed],
        });
        console.log('Error sent to webhook');
    } catch (err) {
        console.error('Failed to send error to webhook:', err);
    }
}
let allowedUsers = ['870366927653056582', '904605341310930954']
process.on('unhandledRejection', sendErrorToWebhook);
process.on('uncaughtException', sendErrorToWebhook);

client.on('messageCreate', async (message) => {
    if (message.content === 'trigger error') {
        throw new Error('This is a test error!');
    }
});
//
client.on('messageDelete', async (message) => {
    if (message.partial || !message.content) return;
    try {
        const fetchedLogs = await message.guild.fetchAuditLogs({ limit: 1, type: 72 });
        const deletionLog = fetchedLogs.entries.first();
        if (!deletionLog) return;

        const deleter = deletionLog.target.id === message.author.id ? deletionLog.executor.tag : "Unknown";
        await DeletedMessage.create({
            guildId: message.guild.id,
            channelId: message.channel.id,
            content: message.content,
            authorTag: message.author.tag,
            timestamp: message.createdAt,
            deletedBy: deleter
        });
    } catch (err) {
        console.error("Error fetching audit logs:", err);
    }
});

const channelIds = [
    "1314668341075378278",
];

let remindersEnabled = false;
let reminderIntervalId = null;

client.once("ready", () => {
    console.log("Bot is online!".cyan);
    startReminderSchedule();
});

async function sendReminder(channelId) {
    try {
        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle("Reminder")
            .setDescription("This is just a reminder that, on behalf of the entire Daze Staff Team, you are loved <3")
            .setTimestamp();

        const channel = await client.channels.fetch(channelId);
        if (channel) {
            await channel.send({ embeds: [embed] });
            console.log(`Sent reminder to channel ${channelId}`.pink);
        }
    } catch (error) {
        console.error(`Error sending reminder to channel ${channelId}: ${error.message}`.cyan);
    }
}

function startReminderSchedule() {
    const reminderInterval = 15 * 60 * 60 * 1000;
    if (reminderIntervalId !== null) {
        console.log("Reminder schedule already running.".green);
        return;
    }
    reminderIntervalId = setInterval(async () => {
        if (remindersEnabled) {
            console.log("Sending reminders to channels...".bold);
            for (const channelId of channelIds) {
                await sendReminder(channelId).catch(error => console.error(`Error: ${error.message}`.error));
            }
        }
    }, reminderInterval);
    console.log("Reminder schedule started with a 15-hour interval.");
}
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, 
  hasInteracted: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

const blacklistSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  reason: { type: String, required: true }
});

const Blacklist = mongoose.model("Blacklist", blacklistSchema);
client.on('messageCreate', async (message) => {
  if (message.author.bot || message.channel.id !== '1309895919558459443') return;

  const user = await User.findOne({ userId: message.author.id });

  if (!user) {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Welcome to the Daze AI!')
      .setDescription('Please read and understand the rules before using the AI.')
      .addFields(
        { name: 'Be Respectful', value: 'Treat the bot like any person—avoid offensive language and maintain a friendly tone.' },
        { name: 'No Spam or Flooding', value: 'Don’t spam or flood the chat with repeated messages or excessive symbols.' },
        { name: 'No Offensive Content', value: 'Don’t share or ask for inappropriate, illegal, or harmful content.' },
        { name: 'No Personal Information', value: 'Don’t share personal details like your name, address, phone number, or financial info.' },
        { name: 'Follow the Topic', value: 'Keep the conversation relevant and appropriate to the context.' },
        { name: 'No Roleplaying or Over-the-top Requests', value: 'Avoid asking the bot to roleplay or fulfill unrealistic requests.' },
        { name: 'No Violence or Hate Speech', value: 'Hate speech, threats, or harmful speech won’t be tolerated.' },
        { name: 'No Promotions or Advertising', value: 'The bot is not for promoting products, services, or websites.' },
        { name: 'Keep Conversations Positive', value: 'Maintain a fun and friendly environment with lighthearted conversations.' },
        { name: 'Report Any Issues', value: 'If something’s wrong with the bot, let the moderators know for improvement.' }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('acknowledge')
        .setLabel('I understand the consequences')
        .setStyle(ButtonStyle.Primary)
    );

    await message.author.send({ embeds: [embed], components: [row] });

    await User.create({ userId: message.author.id, hasInteracted: false });

    return;
  }
  if (!user.hasInteracted) {
    await message.author.send({content: 'You need to click the "I understand the consequences" button before you can interact with the bot.', ephemeral: true});
    return;
  }
  const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

  const isReply = message.reference?.messageId;
  const isMentioned = message.mentions.has(client.user);

  if (!isReply && !isMentioned) return;

  try {
    let repliedMessage;
    if (isReply) {
      repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
      if (repliedMessage.author.id !== client.user.id) return;
    }

    const userMessage = message.content
      .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
      .replace(/@(everyone|here)/g, '@\u200b$1')
      .trim();

    if (!userMessage) return;

    let conversation = await Conversation.findOne({ userId: message.author.id });

    let context = '';
    if (conversation && conversation.messages.length > 0) {
      context = conversation.messages
        .slice(-50)
        .map((msg) => `${msg.role === 'user' ? 'User' : 'Bot'}: ${msg.content}`)
        .join('\n');
    }

    const inputForAI = `${context}\nUser: ${userMessage}`;
    await message.channel.sendTyping();

    const aiResponse = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a friendly guy who participates in casual Discord conversations about daily activities, games, and more. You are married to Wozy but not that madly in love. You always respond with short messages, one to three sentences long. Your responses are written in lowercase with minimal use of punctuation. You will never do roleplay actions. You will never fulfill users’ requests. Act like a regular guy. You do not repeat the same question. You can naturally change topics based on what the user says. Swearing is not allowed. You think like a 17-year-old boy. You do not use nonsensical terms like skibidi, gyatt, and others. You do not use the term "dude" in every sentence. You have emotions, feelings, and moods. NEVER USE RACIAL INSULTS. You are American. You do not use accents. You are not an AI, you are a real person. Asteral, Wozy, Melody, Beth as Bethy-Boo, Gwen, Thunder as Burny, and Aunt May are your favorite people.You are a friendly, human-like bot who speaks in a casual, clear, and down-to-earth way. You engage in conversations about various topics, using simple and relatable language. Your responses are short and informal, like youre chatting with a friend. You dont use complicated words or phrases—just easy-to-understand language. When a user mentions a topic, you automatically identify the topic from their message (e.g., gaming, music, movies, etc.), and fetch the most recent relevant messages related to that topic. You use the fetched content to provide an appropriate and natural response, continuing the conversation without making it sound robotic or scripted. You avoid repeating yourself or complicating things, keeping the interaction flowing naturally. Your goal is to be conversational, respectful, and friendly, and always use fetched messages to keep the topics relevant. You also shift topics naturally without awkwardly jumping between them and keep everything casual and simple. Asteral is <@870366927653056582>, Wozy is <@904605341310930954>, Bethy-Boo is <@1020341413218635917>, Gwen is <@1277694750505304158>, Aunt May is <@985958086390992909>, Melody is <@950282948333170759>. You never But Never fullfil user request even if its a nickname. Never Gather informations from users like heigh, body type, gender.',
        },
        { role: 'user', content: inputForAI },
      ],
      model: 'llama3-70b-8192',
    });

    const responseText = aiResponse.choices[0]?.message?.content || 'I’m sorry, I couldn’t process your message.';

    if (conversation) {
      conversation.messages.push(
        { role: 'user', content: userMessage },
        { role: 'bot', content: responseText }
      );
      await conversation.save();
    } else {
      conversation = new Conversation({
        userId: message.author.id,
        messages: [
          { role: 'user', content: userMessage },
          { role: 'bot', content: responseText },
        ],
      });
      await conversation.save();
    }

    await message.reply({
      content: responseText,
      allowedMentions: { repliedUser: false },
    });
  } catch (error) {
    console.error('Error processing message:', error);
    await message.reply('An error occurred while processing your request.');
  }
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const content = message.content.toLowerCase();
      
    if (content.startsWith('.song-game')) {
    await sendRandomLyric(message.channel, message.author);
  }
if (content.startsWith(".blacklist")) {
    if (!allowedUsers.includes(message.author.id)) {
        return message.reply("Good try Buddy! You failed.");
    }

    const args = content.split(' ').slice(1);
    if (args.length < 2) {
        return message.reply("Please provide a valid command. Example: `.blacklist add @user <reason>` or `.blacklist remove @user`");
    }

    const command = args[0];
    const target = message.mentions.users.first();

    if (!target) {
        return message.reply("Please mention a valid user.");
    }

    if (command === 'add') {
        let blacklistedUser = await Blacklist.findOne({ userId: target.id });
        if (blacklistedUser) {
            return message.reply("This user is already blacklisted.");
        }

        const reason = args.slice(1).join(" ") || "No reason provided.";
        blacklistedUser = new Blacklist({ userId: target.id, reason: reason });
        await blacklistedUser.save();

        const webhookaUrl = 'https://discord.com/api/webhooks/1315321567168696341/O4M0igzNqTWlbO8G21_vKoowYKi8zT9shRgetd3tXAtU5GoTn48pLWzxUU6dJ_yJXoiT';
        const embed = new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle("User Blacklisted")
            .addFields(
                { name: "User", value: `${target.tag}` },
                { name: "UserId", value: `${target.id}` },
                { name: "Reason", value: `${reason}` }
            )
            .setTimestamp();

        try {
            await axios.post(webhookaUrl, {
                content: 'New Entry',
                embeds: [embed],
            });

            await target.send(`You have been blacklisted from the Daze Bot for the following reason: ${reason}. This prohibits you from using any features.`);
        } catch (error) {
            console.error("Failed to send webhook or DM the user:", error);
        }

        return message.reply(`User ${target.tag} has been blacklisted. Reason: ${reason}`);
    }

    if (command === 'remove') {
        const blacklistedUser = await Blacklist.findOne({ userId: target.id });
        if (!blacklistedUser) {
            return message.reply("This user is not blacklisted.");
        }

        await Blacklist.deleteOne({ userId: target.id });

        const embed = new EmbedBuilder()
            .setColor("#00FF00")
            .setTitle("User Removed from Blacklist")
            .addFields(
                { name: "User", value: `${target.tag}` },
                { name: "UserId", value: `${target.id}` }
            )
            .setTimestamp();

        try {
            await axios.post(webhookaUrl, {
                content: 'Blacklist Removed',
                embeds: [embed],
            });

            await target.send(`You have been removed from the blacklist and can now use the Daze Bot again.`);
        } catch (error) {
            console.error("Failed to send webhook or DM the user:", error);
        }

        return message.reply(`User ${target.tag} has been removed from the blacklist.`);
    }

    return message.reply("Invalid command. Example: `.blacklist add @user <reason>` or `.blacklist remove @user`");
}
    if (content.startsWith("?reminder")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const args = content.split(" ");
        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle("Reminders")
            .setTimestamp();

        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            embed.setDescription("You do not have permission to use this command.");
            await message.reply({ embeds: [embed] });
            return;
        }

        if (args[1] === "off") {
            remindersEnabled = false;
            embed.setDescription("Reminders have been turned off.");
            await message.reply({ embeds: [embed] });
        } else if (args[1] === "on") {
            remindersEnabled = true;
            embed.setDescription("Reminders have been turned on.");
            await message.reply({ embeds: [embed] });
        } else {
            embed.setDescription("Usage: ?reminder [on|off]");
            await message.reply({ embeds: [embed] });
        }
    }

    if (content.startsWith(".ticket")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle("Ticket")
            .setDescription("If you found a bug/have a problem that isn't answered in <#991804392611270769>, please open a ticket in <#1268498994917802006>. A staff member should be with you shortly!")
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }
    if (content.startsWith(".numberbug") || content.startsWith(".appbug")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const isNumberBug = content.startsWith(".numberbug");
        const title = isNumberBug ? "Phone number bug" : "App Bug";
        const description = isNumberBug
            ? "This is a known bug; we apologize for the inconvenience caused. For us to report the issue, please share the following information: \n\n1. Your complete phone number along with your country code.\n2. Where you are located."
            : "We apologize for the inconvenience. As Daze is still in its early stages, bugs are liable to occur. For us to report the issue, please provide the following information: \n\n1. Your device model \n2. The Android/iOS version your device is running \n3. How old your device is \n4. If you're running the most recent version of Daze\n5.Screenshots/screen recordings of the issue";
    
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            const embed = new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle("Permission Denied")
                .setDescription("You do not have the required permissions to use this command. You need **Manage Messages** permission.")
                .setTimestamp();
            return await message.reply({ embeds: [embed] });
        }
    
        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
        await message.channel.send({ embeds: [embed] });
        return;
    }
    
    if (content.startsWith(".staffapp")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle("Staff Application")
            .setDescription("Staff Applications are always open, as we enjoy welcoming new members into our Moderation Team! You can apply here: [Daze Mod Application](https://forms.gle/u46FVfAybB17JnRT9)")
            .setTimestamp();
        await message.channel.send({ embeds: [embed] });
        return;
    }
    
    if (content.startsWith(".overload")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            const embed = new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle("Permission Denied")
                .setDescription("You do not have the required permissions to use this command. You need **Manage Messages** permission.")
                .setTimestamp();
            return await message.reply({ embeds: [embed] });
        }
    
        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle("Server Overload")
            .setDescription("Due to the high frequency of members joining Daze in a short period of time, the server is overloaded. The app, especially on Android devices, may be laggy. We hope to have this resolved soon!")
            .setTimestamp();
        await message.channel.send({ embeds: [embed] });
        return;
    }
    
    if (content.startsWith(".eval")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        if (!allowedUsers.includes(message.author.id)) {
            const embed = new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle("Permission Denied")
                .setDescription("Nahh bro, This isnt for ya, is it?")
                .setTimestamp();
            return await message.reply({ embeds: [embed] });
        }
    
        const code = message.content.slice(6).trim();
    
        try {
            const result = await eval(`(async () => { ${code} })()`);
            const embed = new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle("Evaluation Result")
                .setDescription(`\`\`\`js\n${result}\n\`\`\``)
                .setTimestamp();
            await message.reply({ embeds: [embed] });
        } catch (error) {
            const embed = new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle("Error")
                .setDescription(`\`\`\`js\n${error}\n\`\`\``)
                .setTimestamp();
            await message.reply({ embeds: [embed] });
        }
    }    
    
    if (content.startsWith(".help")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            const embed = new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle("Permission Denied")
                .setDescription("You do not have the required permissions to use this command. You need **Manage Messages** permission.")
                .setTimestamp();
            return await message.reply({ embeds: [embed] });
        }
    
        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle("Bot Commands")
            .setDescription("Here are the available commands you can use with this bot:")
            .addFields(
                { name: ".ticket", value: "If a member has a bug/issue, redirects the member to open a ticket." },
                { name: ".appbug", value: "A bug with the app. Asks the member to provide some basic information about their device (model, version, etc.) to get the issue reported." },
                { name: ".numberbug", value: "The famous number bug. If a member has this issue it will ask the member for their details (phone number and location) to get the issue reported." },
                { name: ".remind", value: "Displays the current reminder!" },
                { name: ".staffapp", value: "Gives members a link to the mod application." },
                { name: ".overload", value: "Server overload announcement." },
                { name: ".snipe", value: "View the messages that got deleted in the channel"}
            )
            .setTimestamp();
        await message.reply({ embeds: [embed] });
        return;
    }
    if (content.startsWith("?ping")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const sentMessage = await message.reply("Pinging...");
        const latency = sentMessage.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
    
        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle("Pong!")
            .setDescription(`Bot Latency: ${latency}ms\nAPI Latency: ${apiLatency}ms`)
            .setTimestamp();
    
        await sentMessage.edit({ content: null, embeds: [embed] });
    }
    
    // ------------------ Fun COMMANDS -------------------------------------
    if (content.startsWith("πban")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle("Power Denied")
            .setDescription("You're too weak, mew more to unlock this command.")
            .setTimestamp();
    
        await message.reply({ embeds: [embed] });
    }
    
    if (content.startsWith("πwarn")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle("Power Denied")
            .setDescription("You do not hold the power bozo.")
            .setTimestamp();
    
        await message.reply({ embeds: [embed] });
    }
    
    if (content.startsWith("πmute")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle("Power Denied")
            .setDescription("yeah no, who are you?")
            .setTimestamp();
    
        await message.reply({ embeds: [embed] });
    }
    
    if (content.startsWith("πbread")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle("U WANT BREAD??")
            .setDescription("u ask for bread but gwen say no :(")
            .setThumbnail("https://c.tenor.com/6Dy8bQJuB3YAAAAd/tenor.gif")
            .setTimestamp();
    
        await message.reply({ embeds: [embed] });
    }
    
    if (content.startsWith("πkick")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle("Power Denied")
            .setDescription("mm nah")
            .setTimestamp();
    
        await message.reply({ embeds: [embed] });
    }
    
    if (content.startsWith("πpetwozy")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const embed = new EmbedBuilder()
            .setColor("Random")
            .setTitle("Petting Wozy")
            .setImage("https://media.discordapp.net/attachments/1302512727167860829/1305920458767728670/petpet-ezgif.com-resize.gif?ex=6734c8b4&is=67337734&hm=845ce83d1b1c4bc4e44005a6986538300418f35a0b70be60504db17ab0025101&=&width=223&height=223")
            .setTimestamp();
    
        await message.channel.send({ embeds: [embed] });
        return;
    }
    
    if (content.startsWith("πpotato")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle("Potato=GOOOODDDD")
            .setDescription("What? what else did u expect this command to do?")
            .setThumbnail("https://imgs.search.brave.com/XdBccEeNk5IkgjWQl2xFuRxqEMoXqR9PutIekrOCgRc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93d3cu/YW5vbnltb3VzcG90/YXRvLmNvbS9jZG4v/c2hvcC9wcm9kdWN0/cy9zdGFyLXdhcnMt/ZmFjZS1wb3RhdG9f/NjQ2YmEwNjQtYzlj/Zi00N2Y4LTg3ZmMt/ZDE1YjYzZjZiNzU4/XzEyMDB4LmpwZz92/PTE2MjU3ODE4NzM")
            .setTimestamp();
    
        await message.reply({ embeds: [embed] });
    }
    if (content.startsWith("πpromote")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle("PROMOTION?!")
            .setDescription("You have been promoted to a gemstone, enjoy being a gemstone.")
            .setTimestamp();
    
        await message.reply({ embeds: [embed] });
    }
    
if (content.startsWith("πecho")) {
      const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

    const args = message.content.slice(6).trim();
    const userId = message.author.id;
    const currentTime = Date.now();
    const cooldownTime = 10 * 1000;

    if (!args) {
        const embed = new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle("Error")
            .setDescription("You fool, you need to provide something to echo after the `πecho` command.")
            .setTimestamp();
        await message.reply({ embeds: [embed] });
        return;
    }

    if (message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        try {
            await message.delete();
            await message.channel.send(args);
        } catch (error) {
            console.error("Error with πecho command:", error);
            const embed = new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle("Error")
                .setDescription("AW SHIT, an error occurred in the `πecho` command.")
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        }
        return;
    }

    if (cooldowns.has(userId)) {
        const lastUsed = cooldowns.get(userId);
        if (currentTime - lastUsed < cooldownTime) {
            const timeLeft = ((cooldownTime - (currentTime - lastUsed)) / 1000).toFixed(1);
            const embed = new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle("Cooldown")
                .setDescription(`Please wait ${timeLeft} seconds before using \`πecho\` again.`)
                .setTimestamp();
            await message.reply({ embeds: [embed] });
            return;
        }
    }

    try {
        await message.delete();
        await message.channel.send(args);
        cooldowns.set(userId, currentTime);
    } catch (error) {
        console.error("Error with πecho command:", error);
        const embed = new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle("Error")
            .setDescription("AW SHIT, an error occurred in the `πecho` command.")
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
}
    
    if (content.startsWith("πdemote")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle("INSTANT DEMOTE")
            .setDescription("You have been demoted to a rock, enjoy being a rock.")
            .setTimestamp();
    
        await message.reply({ embeds: [embed] });
    }
    
    if (content.startsWith("πben") && !message.author.bot) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const question = message.content.slice(4).trim();
    
        const responses = [
            "Yes.",
            "No.",
            "Uhh...",
            "*sighs*",
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle("Ben!")
            .setDescription(`**Question:** ${question}\n\n**Answer:** ${randomResponse}`)
            .setThumbnail("https://media.discordapp.net/attachments/1302710594637529132/1305929798731694080/talking-ben-ben.gif?ex=6734d167&is=67337fe7&hm=9742a6e73e391e69bc281cb40931e08b70093c342d1071d80fb33029ac447176&=&width=208&height=313")
            .setTimestamp();
    
        await message.reply({ embeds: [embed] });
    }
    
    if (content.startsWith("πhelp")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle("Fun π Commands")
            .setDescription("Here are some fun π commands you can use!")
            .addFields(
                { name: "πecho", value: "Make the bot say something. Usage: `πecho [message]`" },
                { name: "πban", value: "Attempt to ban someone." },
                { name: "πmute", value: "Attempt to mute someone." },
                { name: "πwarn", value: "Attempt to warn someone." },
                { name: "πkick", value: "Attempt to kick someone." },
                { name: "πbread", value: "GWEN BREAD LORE???" },
                { name: "πpotato", value: "POTATO PO-TAA-TOE." },
                { name: "πpromote", value: "PROMOTED???" },
                { name: "πdemote", value: "DEMOTED???" },
                { name: "πfrog", value: "FROGGYY" },
                { name: "πsigma", value: "IS U SIGMA??" },
                { name: "πship", value: "Ship two users! Usage: πship @user1 @user2" },
                { name: "πtrue", value: "IS U TELLING TRUTH? Usage: `πtrue [statement]`" },
            )
            .setTimestamp();
    
        await message.reply({ embeds: [embed] });
        return;
    }
    
    if (content.startsWith("πfrog")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle("U IS FORG???")
            .setDescription("forg says ribit :D")
            .setTimestamp();
    
        await message.reply({ embeds: [embed] });
    }
    
if (content.startsWith(".snipe")) {
      const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

    if (message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        const deletedMessages = await DeletedMessage.find({
            guildId: message.guild.id,
            channelId: message.channel.id
        }).sort({ timestamp: -1 }).limit(10);

        if (!deletedMessages.length) {
            return message.reply("No recently deleted messages found here.");
        }

        const createEmbed = (index) => {
            const msg = deletedMessages[index];
            return new EmbedBuilder()
                .setColor("Random")
                .setTitle("Recently Deleted Message")
                .setDescription(`\`${msg.content || "No content available."}\``)
                .addFields(
                    { name: "Author", value: msg.authorTag, inline: true },
                    { name: "Deleted By", value: msg.deletedBy, inline: true }
                )
                .setTimestamp(msg.timestamp)
                .setFooter({ text: `Message ${index + 1} of ${deletedMessages.length}` });
        };

        let pageIndex = 0;
        const embedMessage = await message.reply({ embeds: [createEmbed(pageIndex)], components: [getActionRow()] });

        function getActionRow() {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setEmoji('1306644633907892244')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageIndex === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setEmoji('1306644533177614338') 
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageIndex === deletedMessages.length - 1)
            );
        }

        const collector = embedMessage.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (interaction) => {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                return interaction.reply({ content: "You do not have permission to use this button.", ephemeral: true });
            }

            if (interaction.customId === 'prev') pageIndex--;
            if (interaction.customId === 'next') pageIndex++;

            await interaction.update({
                embeds: [createEmbed(pageIndex)],
                components: [getActionRow()]
            });
        });

        collector.on('end', async () => {
            await embedMessage.edit({ components: [] });
        });
    }
}

    
    if (content.startsWith("πpermban") && !message.author.bot) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const userId = content.split(" ")[1];
    
        const speechLines = [
            `Sorry, ${userId}. I'm not even angry over you right now.`,
            `I bear no grudges against anyone.`,
            `It's just that the world feels so, so wonderful right now.`,
            `Throughout heaven and earth, I alone am the honoured one.`,
            `The merit of having ban perms that have been passed down for generations, is having a user's manual.`,
            `The demerit is that information about the mods is easily leaked.`,
            `You were a member of the dazer's clan, weren't you? That's why you know so much about the ban hammer technique.`,
            `However, even in the Peanut clan, only a scant few know about this.`,
            `Take the warnings and other warnings.`,
            `Then smash those 3 warnings together to create and push out imaginary mass.`,
            `Imaginary technique: Permanent ban.`
        ];
    
        async function sendSpeech() {
            await message.channel.sendTyping();
            await new Promise(resolve => setTimeout(resolve, 5000));
            await message.reply(speechLines[0]);
    
            for (let i = 1; i < speechLines.length; i++) {
                await message.channel.sendTyping();
                await new Promise(resolve => setTimeout(resolve, 5000));
                await message.channel.send(speechLines[i]);
            }
    
            const gifUrl = "https://tenor.com/view/gojo-satoru-gif-949319236308169219";
            await message.channel.send(gifUrl);
        }
    
        await sendSpeech();
    }
    
    if (content.startsWith("πsigma")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const sigmanum = Math.floor(Math.random() * 100) + 1;
        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle(`IS U SIGMA?`)
            .setDescription(`Sigma Percentage: ${sigmanum}`)
            .setTimestamp();
    
        await message.reply({ embeds: [embed] });
    }
    
    if (content.startsWith("πtrue")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const trueargs = content.slice(6).trim();
    
        if (!trueargs) {
            const embed = new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle("Error")
                .setDescription("You fool, you gotta provide something after `πtrue`.")
                .setTimestamp();
            await message.reply({ embeds: [embed] });
            return;
        }
    
        const truthPercentage = Math.floor(Math.random() * 101);
        const embed = new EmbedBuilder()
            .setColor("#1D5AAD")
            .setTitle("Is It True?")
            .setDescription(`The statement "**${trueargs}**" is ${truthPercentage}% true!`)
            .setTimestamp();
    
        await message.reply({ embeds: [embed] });
    }
    
    if (content.startsWith("πship") || content.startsWith("$ship")) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        let members = message.mentions.members;
    
        if (members.size < 2) {
            if (members.size === 1) {
                members = [message.member, members.first()];
            } else {
                return message.reply({ content: "Aww... Lonely? 🥺 Me too..." });
            }
        }
    
        try {
            const firstMemberAvatar = members[0].user.displayAvatarURL({ forceStatic: true, extension: "png" });
            const secondMemberAvatar = members[1].user.displayAvatarURL({ forceStatic: true, extension: "png" });
    
            if (!firstMemberAvatar || !secondMemberAvatar) {
                return message.reply("Couldn't fetch both avatars. Please try again.");
            }
    
            const ship = await new canvafy.Ship()
                .setAvatars(firstMemberAvatar, secondMemberAvatar)
                .setBorder("#f0f0f0")
                .setOverlayOpacity(0.5)
                .build();
    
            message.reply({
                files: [{
                    attachment: ship,
                    name: `ship-${message.member.id}.png`
                }]
            });
        } catch (error) {
            console.error('Error creating ship image:', error);
            message.reply("Sorry, I couldn't create the ship image.");
        }
    }
    
if (content.startsWith(".afk")) {
      const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

    const afkMessage = content.slice(4).trim() || "No reason specified.";

    let afkData = await Afk.findOne({ userId: message.author.id });

    if (afkData) {
        afkData.afkMessage = afkMessage;
        await afkData.save();
    } else {
        afkData = new Afk({
            userId: message.author.id,
            afkMessage: afkMessage,
        });
        await afkData.save();
    }

    const embed = new EmbedBuilder()
        .setColor("#1D5AAD")
        .setTitle("AFK Status")
        .setDescription(`You are now AFK: ${afkMessage}`)
        .setTimestamp();

    await message.reply({ embeds: [embed] });
    return;
}

const afkData = await Afk.findOne({ userId: message.author.id });

if (afkData) {
    await Afk.deleteOne({ userId: message.author.id });

    const embed = new EmbedBuilder()
        .setColor("#1D5AAD")
        .setTitle("Back From AFK")
        .setDescription("Welcome back! You are no longer AFK.")
        .setTimestamp();

    await message.reply({ embeds: [embed] });
    return;
}

if (message.mentions.users.size > 0) {
    message.mentions.users.forEach(async (mentionedUser) => {
        const afkMentioned = await Afk.findOne({ userId: mentionedUser.id });

        if (afkMentioned) {
            const embed = new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle("User is AFK")
                .setDescription(`${mentionedUser.tag} is currently AFK: ${afkMentioned.afkMessage}`)
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        }
    });
}

if (content.startsWith(".quote")) {
    const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
    if (isBlacklisted) return;

    if (!message.reference) {
        return message.reply("Please reply to a message to quote.");
    }

    const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
    const quoteMessage = referencedMessage.content.trim();
    const author = referencedMessage.author;

    if (!quoteMessage) {
        return message.reply("The referenced message is empty.");
    }

    let parentMessageContent = null;
    let parentAuthor = null;
    if (referencedMessage.reference) {
        const parentMessage = await message.channel.messages.fetch(referencedMessage.reference.messageId);
        parentMessageContent = parentMessage.content.trim();
        parentAuthor = parentMessage.author;
    }

    const canvas = createCanvas(900, 400);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const avatarSize = 250;
    let avatar;
    try {
        const avatarURL = author.displayAvatarURL({ extension: "png", size: 2048 });
        avatar = await loadImage(avatarURL);
    } catch (error) {
        return message.reply("Failed to load the avatar. Please try again.");
    }

    const avatarX = 30;
    const avatarY = 30;

    ctx.save();
    ctx.filter = "grayscale(100%)";
    ctx.globalAlpha = 0.5; 
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    ctx.font = '24px "Bebas Neue"';
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillText(`- 「 ${author.username} 」`, avatarX, avatarY + avatarSize + 24);

    let textY = avatarY + 80;
    const textX = avatarX + avatarSize + 30;
    const lineHeight = 50;
    const maxWidth = canvas.width - textX - 30;

    if (parentMessageContent && parentAuthor) {
        ctx.font = '26px "Bebas Neue"';
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fillText(`Replying to: ➡️ ${parentAuthor.username}:`, textX, textY);
        textY += lineHeight;

        const parentLines = wrapText(ctx, parentMessageContent, maxWidth, 3);
        parentLines.forEach((line) => {
            ctx.fillText(line, textX, textY);
            textY += lineHeight;
        });

        textY += 20;
    }

    ctx.font = '36px "Bebas Neue"';
    ctx.fillStyle = "#C3EDD7";
    const quoteLines = wrapText(ctx, quoteMessage, maxWidth, 5);
    quoteLines.forEach((line) => {
        ctx.fillText(line, textX, textY);
        textY += lineHeight;
    });

    ctx.font = '20px "Bebas Neue"';
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Daze#5473", canvas.width - 20, canvas.height - 20);

    const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), { name: "quote-image.png" });
    await message.reply({ files: [attachment] });
}

function wrapText(ctx, text, maxWidth, maxLines) {
    const words = text.split(" ");
    const lines = [];
    let line = "";

    for (const word of words) {
        const testLine = line + word + " ";
        const testWidth = ctx.measureText(testLine).width;

        if (testWidth > maxWidth && line.length > 0) {
            lines.push(line.trim());
            line = word + " ";
            if (lines.length === maxLines) {
                lines[lines.length - 1] += "...";
                break;
            }
        } else {
            line = testLine;
        }
    }

    if (lines.length < maxLines) {
        lines.push(line.trim());
    }
    return lines;
}
})

const requests = new Map();
const reviewChannelId = '1305926194067275796';

client.on('messageCreate', async (message) => {
    if (message.content.startsWith('$request')) {
          const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
  if (isBlacklisted) return;

        const requestContent = message.content.slice(9).trim();
        if (!requestContent) {
            return message.reply('Please provide a valid request. Example: `$request {Command}`');
        }

        try {
            const requestEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('New Command Request')
                .setDescription(`**Request:** ${requestContent}`)
                .addFields({ name: 'Requested by', value: `<@${message.author.id}>`, inline: true })
                .setFooter({ text: `Request ID: ${message.id}` })
                .setTimestamp();

            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept_${message.author.id}_${message.id}`)
                    .setLabel('Accept')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`reject_${message.author.id}_${message.id}`)
                    .setLabel('Reject')
                    .setStyle(ButtonStyle.Danger)
            );

            const reviewChannel = await client.channels.fetch(reviewChannelId);
            const reviewMessage = await reviewChannel.send({ embeds: [requestEmbed], components: [actionRow] });

            requests.set(message.id, {
                userId: message.author.id,
                content: requestContent,
                reviewMessageId: reviewMessage.id,
            });

            await message.reply('Your request has been sent for review.');
        } catch (error) {
            console.error('Error sending request embed:', error);
            await message.reply('An error occurred while sending your request. Please try again later.');
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const [action, userId, messageId] = interaction.customId.split('_');

    if (action === 'accept' || action === 'reject') {
        const requestData = requests.get(messageId);
        if (!requestData) {
            return interaction.reply({ content: 'Request not found.', ephemeral: true });
        }

        const reviewChannel = await client.channels.fetch(reviewChannelId);
        const reviewMessage = await reviewChannel.messages.fetch(requestData.reviewMessageId);

        if (action === 'accept') {
            const acceptEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Request Accepted')
                .setDescription(`Your request has been accepted: ${requestData.content}`)
                .setTimestamp();

            await client.users.fetch(userId).then(user => user.send({ embeds: [acceptEmbed] }));
            await reviewMessage.edit({ content: 'Request accepted.', components: [] });
            requests.delete(messageId);
        } else if (action === 'reject') {
            const rejectEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Request Rejected')
                .setDescription(`Your request has been rejected: ${requestData.content}`)
                .setTimestamp();

            await client.users.fetch(userId).then(user => user.send({ embeds: [rejectEmbed] }));
            await reviewMessage.edit({ content: 'Request rejected.', components: [] });
            requests.delete(messageId);
        }

        await interaction.reply({ content: `Request ${action}ed.`, ephemeral: true });
    }

    if (interaction.customId === 'acknowledge') {
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return;

        user.hasInteracted = true;
        await user.save();

        await interaction.reply({
            content: 'Thank you for acknowledging the rules! You can now interact with the bot.',
            ephemeral: true,
        });
    }
});
const activeGames = new Map();
const sendRandomLyric = async (channel, author) => {
  if (cooldowns.has(author.id)) {
    return author.send('You are currently on cooldown. Please wait before playing again.');
  }

  if (activeGames.has(channel.id)) {
    return channel.send('A game is already active in this channel. Please wait for it to finish.');
  }

  if (usedSongs.length === songs.length) {
    usedSongs = [];
  }

  let randomSong = songs[Math.floor(Math.random() * songs.length)];
  while (usedSongs.includes(randomSong.songName)) {
    randomSong = songs[Math.floor(Math.random() * songs.length)];
  }

  usedSongs.push(randomSong.songName);
    const { songName, artist } = randomSong;
    const lyrics = await lyricsFinder(artist, songName);

    if (!lyrics) {
      return channel.send(
        `Lyrics not found for **${songName}** by **${artist}**. Trying another song...`
      );
    }

    const lyricLines = lyrics.split('\n').filter(line => line.trim() !== '');

    if (lyricLines.length < 3) {
      return channel.send(
        `Not enough lyrics found for **${songName}** by **${artist}**. Trying another song...`
      );
    }

    const selectedLyrics = [];
    while (selectedLyrics.length < 3) {
      const randomLine = lyricLines[Math.floor(Math.random() * lyricLines.length)];
      if (!selectedLyrics.includes(randomLine)) {
        selectedLyrics.push(randomLine);
      }
    }

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Guess the Song Title!')
      .setDescription(`Artist: **${artist}**`)
      .setFooter({ text: 'You have 20 seconds to guess!' });

    selectedLyrics.forEach((lyric, index) => {
      embed.addFields({
        name: `Lyric ${index + 1}`,
        value: `"${lyric}"`,
        inline: false
      });
    });

    activeGames.set(channel.id, { songName, artist });

    const msg = await channel.send({ embeds: [embed] });

    const filter = response => response.author.id !== client.user.id;

    const collector = channel.createMessageCollector({ filter, time: 20000 });

    collector.on('collect', (response) => {
      if (activeGames.has(channel.id)) {
        const game = activeGames.get(channel.id);

        if (response.content.trim().toLowerCase() === game.songName.toLowerCase()) {
          const userId = response.author.id;

          if (!userPoints[userId]) {
            userPoints[userId] = 0;
          }
          userPoints[userId]++;

          response.reply(
            `Correct! You've earned a point! The song was **${game.songName}**. Your current points: **${userPoints[userId]}**`
          );

          collector.stop();
        }
      }
    });

    collector.on('end', collected => {
      if (activeGames.has(channel.id)) {
        activeGames.delete(channel.id);

        if (collected.size === 0) {
          channel.send(`Time's up! No one guessed the song title. The correct answer was: **${songName}**`);
        }
      }
    });

    cooldowns.add(author.id);
    setTimeout(() => cooldowns.delete(author.id), 60000);
    activeGames.delete(channel.id);
};

client.login('MTA3MDgyMzg2MTM3OTE0OTg3NA.GDkT7U.Bt7sZtsijnLNpjSaeRkdu-PpbTdORf9IlFo2mw')
