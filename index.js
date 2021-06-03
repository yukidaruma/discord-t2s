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
  speed: number;
}} State
*/
/** @type {State} */
const state = restoreState() || {
  listeningChannels: [],
  myUserId: '',
  voiceConnection: null,
  speed: 1.0,
};

/** @param {Discord.Message} msg */
/** @returns {boolean} */
const isMentioned = (msg) => {
  const mentionedUser = msg.mentions.users.first();

  return mentionedUser && mentionedUser.id === state.myUserId;
};

const bangCommand = (command) => `!${command}`;

const internalCommands = {
  /**
   * @param {Discord.VoiceChannel} voiceChannel
   */
  async joinVoiceChannel(voiceChannel) {
    console.log(`Connecting to voice channel: ${voiceChannel.name}...`);

    const voiceConnection = await voiceChannel.join();
    state.voiceConnection = voiceConnection;
    console.log(`Connected to voice channel ${voiceChannel.name}.`);

    voiceConnection.on('disconnect', () => {
      console.log('Successfully disconnected from voice channel.');
    });
    voiceConnection.on('error', (_) => {
      console.error('Voice connection error occured.');
    });
  },

  /** @param {Discord.VoiceChannel} voiceChannel */
  leave(voiceChannel) {
    voiceChannel.leave();
    state.voiceConnection = null;
  },

  /** @param {string[]} listeningChannels */
  setListeningChannels(listeningChannels) {
    state.listeningChannels = listeningChannels;

    const { length: count } = listeningChannels;
    const presenceText = count === 0 ? 'Run `!listen`' : `${count} channel(s)`;

    console.log(`Updating presence text to: "${presenceText}".`);
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
      await internalCommands.joinVoiceChannel(voiceChannel);
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
      msg.reply("I'm already listening to this channel.");
      return;
    }

    internalCommands.setListeningChannels([...state.listeningChannels, channelId]);
    msg.reply("I'm now listening to this channel.");
  },
  list(msg) {
    const channelNames = state.listeningChannels.map((channelId) => `<#${channelId}>`).join(', ');

    msg.reply(`I'm listening to ${state.listeningChannels.length} channels (${channelNames}).`);
  },
  unlisten(msg) {
    const { id: channelIdToRemove } = msg.channel;
    if (state.listeningChannels.includes(channelIdToRemove)) {
      internalCommands.setListeningChannels(
        state.listeningChannels.filter((channelId) => channelId !== channelIdToRemove),
      );
      msg.reply("I'm no longer listening to this channel.");
    }
  },
  speed(msg) {
    const parts = msg.content.split(' ');
    const speed = Number(parts[parts.length - 1]);
    if (!Number.isNaN(speed)) {
      state.speed = speed;
      msg.reply(`Updated speed to ${state.speed}.`);
    }
  },
};

const availableCommands = Object.keys(commands);
const commandPattern = /(?:^| )!(\w+)/;
const availableCommandsText = `Available commands: ${availableCommands
  .map(bangCommand)
  .join(', ')}.`;

client.on('ready', () => {
  console.log(client.user.id);
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
    const lowercased = msg.cleanContent.toLocaleLowerCase();
    const matches = lowercased.match(commandPattern);
    if (matches) {
      const commandName = matches[1];
      const command = commands[commandName];

      if (command) {
        console.log(`Running command: ${commandName}`);
        command(msg);
        return;
      }

      msg.reply(`Invalid command \`${commandName}\`. ${availableCommandsText}`);
      return;
    }

    msg.reply(`No command specified. ${availableCommandsText}`);
    return;
  }

  // Speak text
  if (state.listeningChannels.includes(msg.channel.id)) {
    console.log('Received message to channel listening.');

    if (msg.member.voice.mute) {
      let { cleanContent: text } = msg;
      text = cleanText(text);

      if (text.length === 0) {
        console.log('Skipping empty message.');
        return;
      }

      console.log(`Speaking: ${text}`);

      if (state.voiceConnection) {
        state.voiceConnection.play(await text2speech(text, state.speed));
      } else {
        console.error("I'm not in voice channel.");
      }

      return;
    }

    console.log(`User ${msg.member.displayName} is not muted. Skipping.`);
  }
});

client.on('voiceStateUpdate', (from, to) => {
  if (!state.voiceConnection?.channel) {
    return;
  }

  const channelWithBot = [from, to].find(
    (voiceState) => voiceState.channel?.id === state.voiceConnection.channel.id,
  )?.channel;

  // Leave when the bot becomes alone
  if (channelWithBot && channelWithBot.members.array().length <= 1) {
    internalCommands.leave(channelWithBot);
  }
});

client.on('error', console.error);

client.login(process.env.DISCORD_CLIENT_SECRET);

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
