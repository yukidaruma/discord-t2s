const fs = require('fs');
const { Readable } = require('stream');
const t2s = require('@google-cloud/text-to-speech');
const client = new t2s.TextToSpeechClient({
  credentials: JSON.parse(fs.readFileSync('./google-service-account.json')),
});

/** @returns {Promise<Readable>} audio */
const text2speech = async (text) => {
  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice: { languageCode: process.env.T2S_LANGUAGE_CODE },
    audioConfig: {
      audioEncoding: 'MP3',
      volumeGainDb: Number(process.env.VOLUME_GAIN_DB),
    },
  });
  const { audioContent: audio } = response;

  const readable = new Readable();
  readable._read = () => {};
  readable.push(audio);
  readable.push(null);
  return readable;
};

module.exports = {
  text2speech,
};
