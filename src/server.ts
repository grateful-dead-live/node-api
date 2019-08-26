import * as express from 'express';
import * as fs from 'fs';
import * as store from './store';
import * as etree from './etree';
import * as features from './features';
import * as chunker from './chunker';
import * as queries from './queries';

const PORT = process.env.PORT || 8060;
const ADDRESS = "http://localhost:8060/"//"https://grateful-dead-api.herokuapp.com/";//"http://localhost:8060/";

const app = express();
app.use((_, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.get('/events', (_, res) =>
  res.send(queries.getAllEventInfos())
);

app.get('/details', async (req, res) =>
  res.send(await queries.getEventDetails(req.query.event))
);

app.get('/venue', async (req, res) =>
  res.send(await queries.getVenue(req.query.id))
);

app.get('/location', async (req, res) =>
  res.send(await queries.getLocation(req.query.id))
);

app.get('/setlist', (req, res) => {
  res.send(queries.getSetlist(req.query.event));
});

app.get('/song', (req, res) => {
  res.send(queries.getSongDetails(req.query.id));
});

app.get('/artist', async (req, res) => {
  res.send(await queries.getArtistDetails(req.query.id));
});

app.get('/etreeinfo', async (req, res) => {
  res.send(await etree.getInfoFromEtree(req.query.recording));
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
  const songname = req.query.songname ? req.query.songname : 'Me And My Uncle';
  const count = req.query.count ? req.query.count : 30;
  const skip = req.query.skip ? req.query.skip : 0;
  res.send(await queries.getDiachronicSongDetails(songname, count, skip));
});

app.listen(PORT, async () => {
  await store.isReady();
  console.log('grateful dead server started on port ' + PORT);
  //console.log(queries.getDiachronicSongDetails('Looks Like Rain'));
  //const AUDIO_URI = 'http://archive.org/download/gd1969-11-08.sbd.wise.17433.shnf/gd69-11-08d1t02.mp3';
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