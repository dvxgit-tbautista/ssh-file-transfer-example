require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const speech = require('@google-cloud/speech');
const { Client } = require('ssh2');


const vmUsername = process.env.VM_USERNAME;
const vmPassword = process.env.VM_PASSWORD;
const vmIP = process.env.VM_IP;
const vmSSH = process.env.VM_SSH;

const remotePath = '/var/lib/asterisk/sounds/en/'; // Source path on your Linux VM
const localPath = 'C:/MovedFiles'; // Destination path in your local machine
const filename = 'exercise.mp3'; // Specify the filename you want to copy from the remotePath

const client = new speech.SpeechClient();

function transcribeAudio(filePath) {
  const file = fs.readFileSync(filePath);
  const audioBytes = file.toString('base64');

  const audio = {
    content: audioBytes,
  };
  const config = {
    encoding: 'mp3',
    sampleRateHertz: 48000,
    languageCode: 'en-US',
  };
  const request = {
    audio: audio,
    config: config,
  };

  client
    .recognize(request)
    .then((response) => {
      const transcription = response[0].results
        .map((result) => result.alternatives[0].transcript)
        .join('\n');
      console.log(`Transcription: ${transcription}`);
    })
    .catch((err) => {
      console.error('Transcription error:', err);
    });
}

const conn = new Client();

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) {
      console.error(`SFTP Error: ${err.message}`);
      conn.end();
      return;
    }

    const sourcePath = remotePath + filename;
    const destinationPath = localPath + '/' + filename;

    sftp.fastGet(sourcePath, destinationPath, (err) => {
      if (err) {
        console.error(`File transfer error: ${err.message}`);
        conn.end();
        return;
      }

      console.log('File copied successfully!');

      const filePath = destinationPath;
      transcribeAudio(filePath);

      conn.end();
    });
  });
});

conn.on('error', (err) => {
  console.error(`SSH connection error: ${err.message}`);
});

conn.connect({
  host: vmIP,
  port: 22,
  username: vmUsername,
  password: vmPassword,
});
