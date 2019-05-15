import * as express from 'express';
import * as fs from 'fs';
import * as store from './store';
import * as dbpedia from './dbpedia';
import * as etree from './etree';
import * as features from './features';
import * as chunker from './chunker';
import * as news from './news';
//import * as news2 from './news2';
import { DeadEvent, Venue, Location } from './types';

const PORT = process.env.PORT || 8060;
const ADDRESS = "http://localhost:8060/"//"https://grateful-dead-api.herokuapp.com/";//"http://localhost:8060/";

const app = express();
app.use((_, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/events', (_, res) => {
  const ids: string[] = store.getEventIds();
  const events: DeadEvent[] = ids.map(e => ({
    id: e,
    date: store.getTime(e),
    location: store.getLocation(e).replace('http://dbpedia.org/resource/', '')
  }));
  res.send(events);
});

app.get('/details', async (req, res) =>
  res.send({
    date: store.getTime(req.query.event),
    location: store.getLocation(req.query.event)
      .replace('http://dbpedia.org/resource/', ''),
    venue: getVenue(req.query.event),
    setlist: await this.getSetlist(req.query.event),
    weather: await this.getWeather(req.query.event),
    recordings: await this.getRecordings(req.query.event),
    performers: await this.getPerformers(req.query.event)
  })
)

app.get('/venue', async (req, res) => {
  res.send(await getVenue(req.query.event));
});

async function getVenue(eventId: string): Promise<Venue> {
  const venue: Venue = {
    id: store.getVenue(eventId),
    name: "",
    events: []
  };
  if (venue.id) {
    venue.name = store.getLabel(venue.id);
    venue.events = store.getVenueEvents(venue.id).map(q => store.getEventInfo(q)).sort((a, b) => parseFloat(a.date) - parseFloat(b.date));
    if (!venue.name) { //it exists in dbpedia
      venue.name = venue.id.replace('http://dbpedia.org/resource/', '');
      venue.image = await dbpedia.getImage(venue.id);
      venue.thumbnail = await dbpedia.getThumbnail(venue.id);
      venue.comment = await dbpedia.getComment(venue.id);
      venue.geoloc = await dbpedia.getGeolocation(venue.id);
    }
  }
  return venue;
}

app.get('/location', async (req, res) => {
  let id = store.getLocation(req.query.event);
  if (id) {
    let state = store.getStateOrCountry(id).replace('http://dbpedia.org/resource/', '');
    const location: Location = {
      name: id.replace('http://dbpedia.org/resource/', '').split(',')[0] + ', ' + state,
      events: store.getLocationEvents(id).map(q => store.getEventInfo(q))
        .sort((a, b) => parseFloat(a.date) - parseFloat(b.date)),
      image: await dbpedia.getImage(id),
      thumbnail: await dbpedia.getThumbnail(id),
      comment: await dbpedia.getComment(id),
      geoloc: await dbpedia.getGeolocation(id)
    }
    res.send(location);
  }
});

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

//app.get('/setlist', (req, res) => {
//  res.send(store.getSetlist(req.query.event));
//});

app.get('/setlist', (req, res) => {
  res.send(getSetlist(req.query.event));
});

function getSetlist(event) {
  return store.getSetlist(event).map(r => ({
    song_id: r,
    name: store.getSongLabel(r),//, "http://www.w3.org/2000/01/rdf-schema#label"),
    events: store.getSongEvents(r).map(q => store.getSubeventInfo(q)).sort((a, b) => parseFloat(a.date) - parseFloat(b.date))
  }));
}

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

app.get('/eventinfo', async (req, res) => {
  const splitPath = req.query.audiouri.split('/');
  const recording = splitPath[splitPath.length-2];
  if (recording != null) {
    const eventId = store.getEventId(recording);
    const eventInfo = store.getEventInfo(eventId);
    let images = [];
    images = images.concat(store.getPosters(eventId));
    images = images.concat(store.getTickets(eventId));
    images = images.concat(await getDbpediaImages(eventId, 'getVenue'));
    images = images.concat(await getDbpediaImages(eventId, 'getLocation'));
    eventInfo['images'] = images;
    res.send(eventInfo);
  } else {
    res.send({});
  }
});

async function getDbpediaImages(eventId, storeFunc) {
  const storeResult = store[storeFunc](eventId);
  if (storeResult) {
    const images = await dbpedia.getThumbnail(storeResult);
    if (images) return images;
  }
  return [];
}


app.get('/feature', async (req, res) => {
  const beats = await features.loadFeature(req.query.songid, req.query.feature);
  res.send(beats);
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

app.get('/audiochunk', async (req, res, next) => {
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

app.get('/diachronic', async (req, res, next) => {
  const count = req.query.count ? req.query.count : 30;
  const skip = req.query.skip ? req.query.skip : 0;
  res.send(await features.getDiachronicVersionsAudio(req.query.songname, count, skip));
});


app.listen(PORT, async () => {
  await store.isReady;
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