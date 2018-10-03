const fs = require('fs');
const FeatureLoader = require('./feature-loader').FeatureLoader;

const ARCHIVE = 'http://archive.org/download/';
const FOLDER = 'features/';
const loader = new FeatureLoader();
const audioToSongname = getAudioToSongname();

exports.loadFeature = function(songid, feature) {
  const file = getFile(songid, feature);
  if (file) {
    return loader.loadFeature(file);
  }
}

exports.loadSummarizedFeatures = function(audioUri) {
  const songname = audioToSongname[audioUri];
  const path = FOLDER+songname+'/'+getLocalPath(audioUri);
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

//TODO DO VIA TRIPLE STORE
exports.getDiachronicVersionsAudio = function(songname, count, skip) {
  if (skip >= 0) count *= (skip+1);
  let versions = fs.readdirSync(FOLDER+songname+'/').filter(v => v[0] != '.');
  versions = versions.slice(0, count).filter((v,i) => i % (skip+1) == 0);
  return versions.map(v => {
    const localPath = FOLDER+songname+'/'+v+'/';
    return ARCHIVE+v+'/'+fs.readdirSync(localPath)[0].replace('json', 'mp3');
  });
}

function getFile(songid, feature) {
  let files = fs.readdirSync(FOLDER);
  files = files.filter(f => f.indexOf(songid) >= 0);
  files = files.filter(f => f.indexOf(feature) >= 0);
  if (files.length > 0) {
    return FOLDER+files[0];
  }
}

function getAudioToSongname() {
  const audioToSongname = {};
  const songs = getVisibleFiles(FOLDER);
  songs.forEach(s => {
    const versions = getVisibleFiles(FOLDER+s+'/');
    versions.forEach(v => {
      const localPath = FOLDER+s+'/'+v+'/';
      const audioPath = getArchiveAudioPath(v, fs.readdirSync(localPath)[0]);
      audioToSongname[audioPath] = s;
    });
  })
  return audioToSongname;
}

function getVisibleFiles(folder) {
  return fs.readdirSync(folder).filter(v => v[0] != '.');
}

function getArchiveAudioPath(versionFolder, featureFile) {
  return ARCHIVE+versionFolder+'/'+featureFile.replace('json', 'mp3');
}

function getLocalPath(audioUri) {
  return audioUri.replace('mp3', 'json').replace(ARCHIVE, '');
}

////////

exports.correctSummarizedFeatures = function() {
  const songs = getVisibleFiles(FOLDER);
  songs.forEach(s => {
    const versions = getVisibleFiles(FOLDER+s+'/')
    versions.forEach(v => {
      const folder = FOLDER+s+'/'+v+'/';
      const path = fs.readdirSync(folder)[0];
      const json = JSON.parse(fs.readFileSync(folder+path, 'utf8'));
      Object.keys(json).forEach(feature => {
        json[feature].forEach(entry => {
          if (entry["time"] && !entry["time"]["value"]) {
            entry["time"] = {value: entry["time"]};
          }
          if (entry["label"] && !entry["label"]["value"]) {
            entry["label"] = {value: entry["label"]};
          }
          if (entry["label"] && entry["label"]["value"] && typeof entry["label"]["value"] == "number") {
            entry["label"]["value"] = entry["label"]["value"].toString();
          }
        });
      });
      fs.writeFileSync(folder+path, JSON.stringify(json));
    });
  });
  console.log("done");
}