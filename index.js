const Discord = require('discord.js');
const { text2speech } = require('./t2s');

const client = new Discord.Client();

/**
@typedef {{
  listeningChannels: string[];
  myUserId: string;
  voiceConnection: Discord.VoiceConnection|null;
}} State
*/
/** @type {State} */
const state = restoreState() || {
  listeningChannels: [],
  myUserId: '',
  voiceConnection: null,
};

/** @param {Discord.Message} msg */
/** @returns {boolean} */
const isMentioned = (msg) => {
  const mentionedUser = msg.mentions.users.first();

  return mentionedUser && mentionedUser.id === state.myUserId;
}

const bangCommand = (command) => `!${command}`;

const internalCommands = {
  /** @param {Discord.VoiceChannel} voiceChannel */
  leave(voiceChannel) {
    voiceChannel.leave();
    state.voiceConnection = null;
  }
};

/** @typedef {(...message: Discord.Message[]) => void} OnMessageCallback */
/** @type {Object<string, OnMessageCallback>} */
const commands = {
  async join(msg) {
    const { channel: voiceChannel } = msg.member.voice;

    if (voiceChannel) {
      state.voiceConnection = await voiceChannel.join();
    } else {
      msg.reply('You have to be in a voice channel.');
    }
  },
  kick(msg) {
    const { channel: voiceChannel } = msg.guild.me.voice;
    if (voiceChannel) {
      internalCommands.leave(voiceChannel);
    }
  },
  listen(msg) {
    const { id: channelId } = msg.channel;
    if (state.listeningChannels.includes(channelId)) {
      msg.reply('I\'m already listening to this channel.');
      return;
    }

    state.listeningChannels.push(channelId);
    msg.reply('I\'m now listening to this channel.');
  },
  unlisten(msg) {
    const { id: channelIdToRemove } = msg.channel;
    if (state.listeningChannels.includes(channelIdToRemove)) {
      state.listeningChannels = state.listeningChannels.filter((channelId) => channelId !== channelIdToRemove);
      msg.reply('I\'m no longer listening to this channel.');
    }
  },
};

const availableCommands = Object.keys(commands);

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  state.myUserId = client.user.id;
});

client.on('message', async (msg) => {
  // Ignore own messages
  if (msg.member.id === state.myUserId) {
    return;
  }

  // React to mentions
  if (isMentioned(msg)) {
    const command = availableCommands.find((command) => msg.cleanContent.includes(bangCommand(command)));

    if (command) {
      console.log(`Running command: ${command}`);
      commands[command](msg);
      return;
    }

    msg.reply(`No command specified. Available commands: ${availableCommands.map(bangCommand).join(', ')}.`);
    return;
  }

  // Speak text
  if (state.listeningChannels.includes(msg.channel.id)) {
    console.log('Received message to channel listening.');

    if (msg.member.voice.mute) {
      const { cleanContent: text } = msg;
      console.log(`Speaking: ${text}`);
      state.voiceConnection.play(await text2speech(text));
      return;
    }

    console.log(`User ${msg.member.displayName} is not muted. Skipping.`);
  }
});

client.login(process.env.DISCORD_CLIENT_SECRET);
