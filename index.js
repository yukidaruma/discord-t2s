const Discord = require('discord.js');

const client = new Discord.Client();

/** @type {string} */
let myUserId;

/** @param {Discord.Message} msg */
/** @returns {boolean} */
const isMentioned = (msg) => {
  const mentionedUser = msg.mentions.users.first();

  return mentionedUser && mentionedUser.id === myUserId;
}

/** @typedef {(...message: Discord.Message[]) => void} OnMessageCallback */
/** @type {Object<string, OnMessageCallback>} */
const commands = {
  listen: (msg) => {
    msg.reply('Hey, listen!');
  },
};
const availableCommands = Object.keys(commands);

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  myUserId = client.user.id;
});

client.on('message', (msg) => {
  if (isMentioned(msg)) {
    const command = availableCommands.find((command) => msg.cleanContent.includes(`!${command}`));

    if (command) {
      commands[command](msg);
    }
  }
});

client.login(process.env.DISCORD_CLIENT_SECRET);
