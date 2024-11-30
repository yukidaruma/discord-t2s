/** @typedef {import('./index').State} State */

const fs = require('fs');

const persistentStateKeys = ['listeningChannels'];
const PERSISTENT_FILE = './data.json';

const cleanText = (text) => {
  // Remove whitespaces for Japanese text to save some oost.
  const whiteSpaceReplacer = process.env.T2S_LANGUAGE_CODE.startsWith('ja') ? '' : ' ';

  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[\s\n　]/g, whiteSpaceReplacer)
    .trim();
};

const persistState = (states) => {
  const savedStates = {};

  Object.entries(states).forEach(([serverId, serverState]) => {
    const savedServerState = {};
    persistentStateKeys.forEach((key) => {
      savedServerState[key] = serverState[key];
    });
    savedStates[serverId] = savedServerState;
  });

  fs.writeFileSync(PERSISTENT_FILE, JSON.stringify(savedStates));
};

/** @returns {State|null} state */
const restoreState = () => {
  return fs.existsSync(PERSISTENT_FILE) ? JSON.parse(fs.readFileSync(PERSISTENT_FILE)) : null;
};

module.exports = {
  cleanText,
  persistState,
  restoreState,
};
