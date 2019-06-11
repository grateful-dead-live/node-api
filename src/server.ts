import * as express from 'express';
import * as fs from 'fs';
import * as store from './store';
import * as dbpedia from './dbpedia';
import * as etree from './etree';
import * as features from './features';
import * as chunker from './chunker';
import * as news from './news';
//import * as news2 from './news2';

import { DeadEventDetails, Venue, Location, SongInfo, SongWithAudio, DbpediaObject } from './types';

const PORT = process.env.PORT || 8060;
const ADDRESS = "http://localhost:8060/"//"https://grateful-dead-api.herokuapp.com/";//"http://localhost:8060/";

const app = express();
app.use((_, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


const SONGMAP = JSON.parse(fs.readFileSync('json-data/app_song_map.json', 'utf8'));

app.get('/events', (_, res) => {
  res.send(store.getEventIds().map(store.getEventInfo));
});

app.get('/details', async (req, res) => {
  const [loc, ven, per] = await Promise.all([
    getLocation(store.getLocationForEvent(req.query.event)),
    getVenue(store.getVenueForEvent(req.query.event)),
    getPerformers(req.query.event)
  ]);
  const artifacts = [];
  store.getTickets(req.query.event).forEach(t => artifacts.push({type: 'ticket', image: t}));
  store.getPosters(req.query.event).forEach(p => artifacts.push({type: 'poster', image: p}));
  store.getPasses(req.query.event).forEach(p => artifacts.push({type: 'pass', image: p}));
  store.getEnvelopes(req.query.event).forEach(p => artifacts.push({type: 'envelope', image: p}));
  store.getPhotos(req.query.event).forEach(p => artifacts.push({type: 'photo', image: p}));
  const details: DeadEventDetails = {
    id: req.query.event,
    date: store.getTime(req.query.event),
    location: loc,
    venue: ven,
    setlist: getSetlist(req.query.event),
    weather: store.getWeather(req.query.event),
    recordings: store.getRecordings(req.query.event),
    performers: per,
    artifacts: artifacts
  };
  res.send(details);
});

app.get('/venue', async (req, res) =>
  res.send(await getVenue(req.query.id))
);

app.get('/location', async (req, res) =>
  res.send(await getLocation(req.query.id))
);

app.get('/weather', (req, res) => {
  res.send(store.getWeather(req.query.event));
});

app.get('/news', async (req, res) => {
  let t = store.getTime(req.query.event);
  //console.log(t);
  res.send(await news.getObjectFromNytimes(t));
});

app.get('/news2', async (req, res) => {
  let t = store.getTime(req.query.event);
  //res.send(await news.getObjectFromNytimes(t));
  res.send(await news.getObjectFromGuardian(t));
});

app.get('/posters', (req, res) =>
  res.send(store.getPosters(req.query.event))
);

app.get('/tickets', (req, res) =>
  res.send(store.getTickets(req.query.event))
);

app.get('/passes', (req, res) =>
  res.send(store.getPasses(req.query.event))
);

app.get('/envelopes', (req, res) =>
  res.send(store.getEnvelopes(req.query.event))
);

app.get('/photos', (req, res) =>
  res.send(store.getEnvelopes(req.query.event))
);

app.get('/setlist', (req, res) => {
  res.send(getSetlist(req.query.event));
});

app.get('/recordings', (req, res) => {
  res.send(store.getRecordings(req.query.event));
});

app.get('/song', (req, res) => {
  res.send(getSongWithAudio(req.query.id));
});

app.get('/performers', async (req, res) => {
  res.send(await getPerformers(req.query.event));
});

app.get('/etreeinfo', async (req, res) => {
  res.send(await etree.getInfoFromEtree(req.query.recording));
});

app.get('/eventinfo', async (req, res) => {
  const splitPath = req.query.audiouri.split('/');
  const recording = splitPath[splitPath.length-2];
  if (recording != null) {
    const eventId = store.getEventId(recording);
    const eventInfo = store.getEventInfo(eventId);
    const dbpImg = await Promise.all([
      getDbpediaThumbs(eventId, 'getVenue'),
      getDbpediaThumbs(eventId, 'getLocation')]);
    eventInfo['images'] = [
      store.getPosters(eventId),
      store.getTickets(eventId),
      dbpImg[0],
      dbpImg[1]
    ];
    res.send(eventInfo);
  } else {
    res.send({});
  }
});

app.get('/feature', async (req, res) => {
  res.send(await features.loadFeature(req.query.songid, req.query.feature));
});

app.get('/featuresummary', async (req, res) => {
  let audio = req.query.audiouri;
  if (audio.indexOf('audiochunk')) {
    audio = audio.replace(ADDRESS+'audiochunk?filename=', '');
    const paramsIndex = audio.indexOf('&fromsecond');
    if (paramsIndex > 0) {
      audio = audio.slice(0, paramsIndex);
    }
  }
  res.send(await features.loadSummarizedFeatures(audio));
});

app.get('/audiochunk', async (req, res) => {
  //http://localhost:8060/audiochunk?filename=http://archive.org/download/gd1985-03-13.sbd.miller.77347.flac16/gd85-03-13d1t03.mp3&fromsecond=4&tosecond=6
  const filename = req.query.filename;
  const fromSecond = req.query.fromsecond ? parseFloat(req.query.fromsecond) : 0;
  const toSecond = req.query.tosecond ? parseFloat(req.query.tosecond) : 120;
  if (filename && !isNaN(fromSecond) && !isNaN(toSecond)) {
    res.setHeader('Content-Type', 'audio/mp3');
    //curiously this is by far the fastest!
    await chunker.saveMp3Chunk(filename, fromSecond, toSecond, 'temp-audio/temp.mp3');
    res.send(fs.readFileSync('temp-audio/temp.mp3'));
    //chunker.pipeMp3Chunk(filename, fromSecond, toSecond, res);
    //const buffer = await chunker.getMp3Chunk(filename, fromSecond, toSecond);
  }
});

app.get('/diachronic', async (req, res) => {
  const count = req.query.count ? req.query.count : 30;
  const skip = req.query.skip ? req.query.skip : 0;
  res.send(await features.getDiachronicVersionsAudio(req.query.songname, count, skip));
});

async function getVenue(venueId: string): Promise<Venue> {
  const LMO_DBPEDIA = "https://w3id.org/lmo/vocabulary/dbpedia";
  if (venueId) {
    const venueDbpedia = store.getObject(venueId, LMO_DBPEDIA);
    const label = store.getLabel(venueId);
    return Object.assign({
      id: venueId,
      name: label ? label : store.dbpediaToName(venueId),
      eventIds: store.getVenueEvents(venueId)
    }, await getDbpediaInfo(venueDbpedia));
  }
}

async function getLocation(locationId: string): Promise<Location> {
  if (locationId) {
    return Object.assign({
      id: locationId,
      name: store.dbpediaToName(locationId).split(',')[0],
      state: store.dbpediaToName(store.getStateOrCountry(locationId)),
      eventIds: store.getLocationEvents(locationId)
    }, await getDbpediaInfo(locationId));
  }
}

async function getDbpediaInfo(id: string): Promise<DbpediaObject> {
  const info = await Promise.all([
    dbpedia.getImage(id),
    dbpedia.getThumbnail(id),
    dbpedia.getComment(id),
    dbpedia.getGeolocation(id)
  ]);
  return {
    image: info[0],
    thumbnail: info[1],
    comment: info[2],
    geoloc: info[3]
  }
}

function getSetlist(eventId: string): SongInfo[] {
  return store.getSetlist(eventId).map(getSongInfo);
}

function getSongWithAudio(songId: string): SongWithAudio {
  const info = getSongInfo(songId);
  return Object.assign(info, {audio: SONGMAP[info.name.toLowerCase()]});
}

function getSongInfo(songId: string): SongInfo {
  return {
    id: songId,
    name: store.getSongLabel(songId),
    eventIds: store.getSongEvents(songId)
  }
}

async function getPerformers(eventId: string) {
  const performers = store.getPerformers(eventId);
  return Promise.all(performers.map(async p => {
    const imgs = await Promise.all([
      dbpedia.getImage(p.sameAs), dbpedia.getThumbnail(p.sameAs)]);
    p["image"] = imgs[0];
    p["thumbnail"] = imgs[1];
    return p
  }));
}

async function getDbpediaThumbs(eventId, storeFunc) {
  const storeResult = store[storeFunc](eventId);
  if (storeResult) {
    const images = await dbpedia.getThumbnail(storeResult);
    if (images) return images;
  }
  return [];
}


app.listen(PORT, async () => {
  await store.isReady();
  console.log('grateful dead server started on port ' + PORT);
  const AUDIO_URI = 'http://archive.org/download/gd1969-11-08.sbd.wise.17433.shnf/gd69-11-08d1t02.mp3';
  /*console.log(await store.getEventId('gd1969-11-08.sbd.wise.17433.shnf'))
  console.log(await store.getEventId('gd1969-11-02.sbd.miller.32273.flac16'))
  console.log(await store.getEventId('d1969-11-07.sbd.kaplan.21762.shnf'))*/
  //console.log(await chunker.getMp3Chunk(AUDIO_URI, 0, 30));
  //features.correctSummarizedFeatures();
  //chunker.pipeMp3Chunk(AUDIO_URI, 10, 12, null);
  //console.log(await features.loadFeature('gd66-01-08.d1t45', 'beats'));
  //console.log(await features.getDiachronicVersionsAudio('goodlovin', 10));
  //console.log(await features.loadSummarizedFeatures('http://archive.org/download/gd1969-11-08.sbd.wise.17433.shnf/gd69-11-08d1t02.mp3'))
  //console.log(await features.loadSummarizedFeatures('goodlovin', 'gd1969-11-21.set2.sbd.gmb.96580.flac16/gd1969-11-21t01.mp3'));
});