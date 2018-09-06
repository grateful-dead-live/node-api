const fs = require('fs');
const FeatureLoader = require('./feature-loader').FeatureLoader;

const FOLDER = 'features/';
const loader = new FeatureLoader();

exports.loadFeature = function(songid, feature) {
  const file = getFile(songid, feature);
  if (file) {
    return loader.loadFeature(file);
  }
}

function getFile(songid, feature) {
  let files = fs.readdirSync(FOLDER);
  files = files.filter(f => f.indexOf(songid) >= 0);
  files = files.filter(f => f.indexOf(feature) >= 0);
  if (files.length > 0) {
    return FOLDER+files[0];
  }
}