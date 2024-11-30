const Discord = require('discord.js');

/** @type {Discord.GatewayIntentsString[]} */
const requiredPermissions = [
  // General permissions
  'GuildMessages',

  // Voice permissions
  'GuildVoiceStates',
];

/** @returns {number} */
const getPermissionFlag = () => {
  const permissionFlags = Object.entries(Discord.PermissionFlagsBits)
    .filter(([key, _]) => requiredPermissions.includes(key))
    .map(([_, value]) => value)
    .reduce((sum, flag) => (sum += flag), 0);

  return permissionFlags;
};

const commands = {
  link([clientId]) {
    console.log(
      `https://discord.com/oauth2/authorize?client_id=${
        clientId || process.env.DISCORD_CLIENT_ID
      }&scope=bot&permissions=${getPermissionFlag()}`,
    );
  },
  help() {
    console.log(
      `usage: npm run cli -- <command>

Available commands:

   help [command]: Show this help
   link [client_id]: Generate invite link for this bot`,
    );
  },
};

const command = commands[process.argv[2]];
(command ? command : commands.help)(process.argv.slice(3));
