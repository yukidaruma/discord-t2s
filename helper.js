/** @typedef {import('./index').State} State */

const fs = require('fs');

const persistentStateKeys = ['listeningChannels'];
const PERSISTENT_FILE = './data.json';

const cleanText = (text) => {
  return text.replace(/https?:\/\/\S+/g, '');
}

const persistState = (state) => {
  const data = {};

  persistentStateKeys.forEach((key) => {
    data[key] = state[key];
  });

  fs.writeFileSync(PERSISTENT_FILE, JSON.stringify(data));
};

/** @returns {State|null} state */
const restoreState = () => {
  return fs.existsSync(PERSISTENT_FILE)
    ? JSON.parse(fs.readFileSync(PERSISTENT_FILE))
    : null;
};

module.exports = {
  cleanText,
  persistState,
  restoreState,
};
