# discord-t2s

1. Read [Discord.js Guide for "Setting up a bot application"](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)
   and set up one.
2. Install the bot.
   ```sh
   git clone https://github.com/yukidaruma/discord-t2s
   cd discord-t2s
   npm i
   ```
2. Invite the bot to your server.
   ```sh
   # You can obtain your `bot_client_id` at your app's "General Information" page
   npm run cli -- link <bot_client_id>
   ```

## Usage

`@YourBotName !<command>` to execute command. Do not forget to replace
`@YourBotName` with actual bot's name.

1. Run `@YourBotName !listen` to let the bot listen updates.
2. Run `@YourBotName !join` to summon the bot in the voice channel you are in.
3. When bot is in the voice channel, it will speak texts if following conditions
   are met:
   * The message is posted by an user that is muted.
   * The channel that the message is posted in is listened by the bot.

Note: Bot automatically leaves the channel when it becomes alone. You can also
run `@YourBotName !kick` command to kick the bot at any time.

### List of available commands:
* `!listen`, `!unlisten`: (un)listen to the channel
* `!join`: Join the voice channel you are in
* `!kick`: Kick from voice channel


