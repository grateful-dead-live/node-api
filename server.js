const express = require('express');
const store = require('./store');
const dbpedia = require('./dbpedia');
const etree = require('./etree');
const features = require('./features');
const chunker = require('./chunker');


const PORT = process.env.PORT || 8060;

const app = express();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/events', (req, res) => {
  res.send(store.getEventIds().map(e => ({
    id: e,
    date: store.getTime(e),
    location: store.getLocation(e).replace('http://dbpedia.org/resource/', '')
  })));
});

app.get('/venue', async (req, res) => {
  var venue = {
    id: store.getVenue(req.query.event)
  };
  if (venue.id) {
    venue.name = store.getLabel(venue.id);
    venue.events = store.getVenueEvents(venue.id).map(q => store.getEventInfo(q)).sort((a, b) => parseFloat(a.date) - parseFloat(b.date));
    if (!venue.name) { //it exists in dbpedia
      venue["name"] = venue.id.replace('http://dbpedia.org/resource/', '');
      venue["image"] = await dbpedia.getImage(venue.id);
      venue["thumbnail"] = await dbpedia.getThumbnail(venue.id);
      venue["comment"] = await dbpedia.getComment(venue.id);
      venue["geoloc"] = await dbpedia.getGeolocation(venue.id);
    }
    res.send(venue);
  }
});

app.get('/location', async (req, res) => {
  let location = store.getLocation(req.query.event);
  if (location) {
    res.send({
      name: location.replace('http://dbpedia.org/resource/', ''),
      events: store.getLocationEvents(location).map(q => store.getEventInfo(q)).sort((a, b) => parseFloat(a.date) - parseFloat(b.date)),
      image: await dbpedia.getImage(location),
      thumbnail: await dbpedia.getThumbnail(location),
      comment: await dbpedia.getComment(location),
      geoloc: await dbpedia.getGeolocation(location)
    });
  }
});

app.get('/weather', (req, res) => {
  res.send(store.getWeather(req.query.event));
});

app.get('/posters', (req, res) => {
  res.send(store.getPosters(req.query.event));
});

app.get('/tickets', (req, res) => {
  res.send(store.getTickets(req.query.event));
});

//app.get('/setlist', (req, res) => {
//  res.send(store.getSetlist(req.query.event));
//});

app.get('/setlist', (req, res) => {
  res.send(store.getSetlist(req.query.event).map(r => ({
    song_id: r,
    name: store.getSongLabel(r, "http://www.w3.org/2000/01/rdf-schema#label"),
    events: store.getSongEvents(r).map(q => store.getSubeventInfo(q)).sort((a, b) => parseFloat(a.date) - parseFloat(b.date))
  })));
});


app.get('/recordings', (req, res) => {
  res.send(store.getRecordings(req.query.event));
});


app.get('/performers', async (req, res) => {
  let performers = store.getPerformers(req.query.event);
  res.send(await Promise.all(performers.map(async p => {
    p["image"] = await dbpedia.getImage(p.sameAs);
    p["thumbnail"] = await dbpedia.getThumbnail(p.sameAs);
    return p
  })));
});

app.get('/etreeinfo', async (req, res) => {
  //console.log(req.query.recording)
  let e = await etree.getInfoFromEtree(req.query.recording)
  .then(e => res.send(e));
});


app.get('/feature', async (req, res) => {
  const beats = await features.loadFeature(req.query.songid, req.query.feature);
  res.send(beats);
});

app.get('/featuresummary', async (req, res) => {
  res.send(await features.loadSummarizedFeatures(req.query.audiouri));
});

app.get('/audiochunk', (req, res, next) => {
  //http://localhost:8060/audiochunk?filename=http://archive.org/download/gd1985-03-13.sbd.miller.77347.flac16/gd85-03-13d1t03.mp3&fromsecond=4&tosecond=6
  const filename = req.query.filename;
  const fromSecond = parseFloat(req.query.fromsecond);
  const toSecond = parseFloat(req.query.tosecond);
  if (filename && !isNaN(fromSecond) && !isNaN(toSecond)) {
    res.setHeader('Content-Type', 'audio/wav');
    chunker.pipeMp3Chunk(filename, fromSecond, toSecond, res);
  }
});

app.get('/diachronic', async (req, res, next) => {
  res.send(await features.getDiachronicVersionsAudio(req.query.songname, 10));
});


app.listen(PORT, async () => {
  console.log('grateful dead server started at http://localhost:' + PORT);
  const AUDIO_URI = 'http://archive.org/download/gd1969-11-08.sbd.wise.17433.shnf/gd69-11-08d1t02.mp3';
  //features.correctSummarizedFeatures();
  //chunker.pipeMp3Chunk(AUDIO_URI, 10, 12, null);
  //console.log(await features.loadFeature('gd66-01-08.d1t45', 'beats'));
  //console.log(await features.getDiachronicVersionsAudio('goodlovin', 10));
  //console.log(await features.loadSummarizedFeatures('http://archive.org/download/gd1969-11-08.sbd.wise.17433.shnf/gd69-11-08d1t02.mp3'))
  //console.log(await features.loadSummarizedFeatures('goodlovin', 'gd1969-11-21.set2.sbd.gmb.96580.flac16/gd1969-11-21t01.mp3'));
});