const Discord = require('discord.js');
const registerCleanupHandler = require('node-cleanup');
const { cleanText, persistState, restoreState } = require('./helper');
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
  },

  /** @param {string[]} listeningChannels */
  setListeningChannels(listeningChannels) {
    state.listeningChannels = listeningChannels;

    const { length: count } = listeningChannels;
    const presenceText = count === 0
      ? 'Run `!listen`'
      : `${count} channel(s)`;

    console.log(`Updating presence text to: "${presenceText}".`)
    client.user.setPresence({
      activity: {
        name: presenceText,
        type: 'WATCHING',
        url: process.env.BOT_PRESENCE_URL,
      },
    });
  },
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

    internalCommands.setListeningChannels([...state.listeningChannels, channelId]);
    msg.reply('I\'m now listening to this channel.');
  },
  unlisten(msg) {
    const { id: channelIdToRemove } = msg.channel;
    if (state.listeningChannels.includes(channelIdToRemove)) {
      internalCommands.setListeningChannels(
        state.listeningChannels.filter((channelId) => channelId !== channelIdToRemove),
      );
      msg.reply('I\'m no longer listening to this channel.');
    }
  },
};

const availableCommands = Object.keys(commands);

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  state.myUserId = client.user.id;
  internalCommands.setListeningChannels(state.listeningChannels);
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
      let { cleanContent: text } = msg;
      text = cleanText(text);

      console.log(`Speaking: ${text}`);

      if (state.voiceConnection) {
        state.voiceConnection.play(await text2speech(text));
      } else {
        console.error('I\'m not in voice channel.');
      }

      return;
    }

    console.log(`User ${msg.member.displayName} is not muted. Skipping.`);
  }
});

client.on('voiceStateUpdate', (from, to) => {
  if (!state.voiceConnection) {
    return;
  }

  const channelWithBot = [from, to]
    .find((voiceState) => voiceState.channel.id === state.voiceConnection.channel.id)
    .channel;

  // Leave when the bot becomes alone
  if (channelWithBot.members.array().length <= 1) {
    internalCommands.leave(channelWithBot);
  }
});

const shutdown = () => {
  console.log('Received exit event. Stopping bot...');

  console.log('Leaving voice channel...');
  if (state.voiceConnection) {
    internalCommands.leave(state.voiceConnection.channel);
  }

  console.log('Saving state to file...');
  persistState(state);

  console.log('See you again!');
};

registerCleanupHandler(shutdown);

client.login(process.env.DISCORD_CLIENT_SECRET);
