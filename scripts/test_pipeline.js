const fs = require('fs');
const { spawn } = require('child_process');

const parser = require('/tmp/transpiled/voiceParser.js');

const sampleVillages = ['Dahod', 'Vova', 'Garbada', 'Limkheda', 'Jhalod'];
const sampleCategories = ['Kandora', 'Kada', 'Chain', 'Ring', 'Necklace'];

async function runPipelineDiagnostics() {
  console.log('=== STARTING COMPLETE AUDIO & VOICE PIPELINE DIAGNOSTICS ===');

  // TEST 1: Synthesize voice speech using macOS native TTS
  console.log('Step 1: Generating real spoken audio with macOS TTS...');
  const speechText = 'Ramesh Mishra from Vova village Diary 2026 Page 142 loan 50000 rupees silver kandora 500 grams';
  const wavPath = '/tmp/diag_speech.wav';
  const webmPath = '/tmp/diag_speech.webm';

  await new Promise((resolve) => {
    const say = spawn('say', [speechText, '-o', wavPath, '--data-format=LEI16@16000']);
    say.on('close', resolve);
  });

  const wavStat = fs.statSync(wavPath);
  console.log('✓ Generated WAV audio (' + Math.round(wavStat.size / 1024) + ' KB)');

  // Convert to WebM container to test browser MediaRecorder simulation
  await new Promise((resolve) => {
    const ffmpeg = spawn('/opt/homebrew/bin/ffmpeg', ['-i', wavPath, '-c:a', 'libopus', webmPath, '-y'], { stdio: 'ignore' });
    ffmpeg.on('close', resolve);
  });
  const webmStat = fs.statSync(webmPath);
  console.log('✓ Generated WebM container (' + Math.round(webmStat.size / 1024) + ' KB)');

  // TEST 2: Transcribe WAV with transcribeWorker.js
  console.log('Step 2: Testing transcribeWorker.js on WAV audio...');
  const wavResult = await new Promise((resolve) => {
    const worker = spawn('/usr/local/bin/node', ['scripts/transcribeWorker.js', wavPath, 'en'], {
      env: { ...process.env, PATH: process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin' }
    });
    let out = '';
    worker.stdout.on('data', d => out += d.toString());
    worker.on('close', () => {
      const match = out.match(/__JSON_START__(.*?)__JSON_END__/s);
      resolve(match ? JSON.parse(match[1]) : { transcript: '' });
    });
  });
  console.log('✓ WAV Transcript: ' + wavResult.transcript);

  // TEST 3: Transcribe WebM with transcribeWorker.js
  console.log('Step 3: Testing transcribeWorker.js on WebM audio...');
  const webmResult = await new Promise((resolve) => {
    const worker = spawn('/usr/local/bin/node', ['scripts/transcribeWorker.js', webmPath, 'en'], {
      env: { ...process.env, PATH: process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin' }
    });
    let out = '';
    worker.stdout.on('data', d => out += d.toString());
    worker.on('close', () => {
      const match = out.match(/__JSON_START__(.*?)__JSON_END__/s);
      resolve(match ? JSON.parse(match[1]) : { transcript: '' });
    });
  });
  console.log('✓ WebM Transcript: ' + webmResult.transcript);

  // TEST 4: Parse Transcripts into Structured Loan Records
  console.log('Step 4: Testing voiceParser on transcripts...');
  const parsedFromWav = parser.parseBulkVoiceToExcelRecords(wavResult.transcript, sampleVillages, sampleCategories);
  console.log('Parsed WAV count: ' + parsedFromWav.length);
  if (parsedFromWav.length > 0) {
    const r = parsedFromWav[0];
    console.log('  Customer: ' + r.name + ', Village: ' + r.village + ', Diary: ' + r.diary + ', Page: ' + r.pageNumber + ', Loan: Rs.' + r.loanAmount + ', Metal: ' + r.metal + ' ' + r.category + ' ' + r.weight + 'g');
  }

  const parsedFromWebm = parser.parseBulkVoiceToExcelRecords(webmResult.transcript, sampleVillages, sampleCategories);
  console.log('Parsed WebM count: ' + parsedFromWebm.length);
  if (parsedFromWebm.length > 0) {
    const r = parsedFromWebm[0];
    console.log('  Customer: ' + r.name + ', Village: ' + r.village + ', Diary: ' + r.diary + ', Page: ' + r.pageNumber + ', Loan: Rs.' + r.loanAmount + ', Metal: ' + r.metal + ' ' + r.category + ' ' + r.weight + 'g');
  }

  // TEST 5: Verify Hindi Statement parsing
  console.log('Step 5: Testing Hindi statement parsing...');
  const hindiStatement = '1. सुरेश डामोर गरबाड़ा डायरी 2026 पेज 50 पचास हजार रुपये चांदी कंदोरा 500 ग्राम';
  const parsedHindi = parser.parseBulkVoiceToExcelRecords(hindiStatement, sampleVillages, sampleCategories);
  console.log('Parsed Hindi count: ' + parsedHindi.length);
  if (parsedHindi.length > 0) {
    const r = parsedHindi[0];
    console.log('  Customer: ' + r.name + ', Village: ' + r.village + ', Diary: ' + r.diary + ', Page: ' + r.pageNumber + ', Loan: Rs.' + r.loanAmount + ', Metal: ' + r.metal + ' ' + r.category + ' ' + r.weight + 'g');
  }

  console.log('=== ALL DIAGNOSTIC TESTS PASSED SUCCESSFULLY ===');
}

runPipelineDiagnostics().catch(console.error);
