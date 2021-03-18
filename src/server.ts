import * as express from 'express';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as store from './store';
//import * as features from './features';
import * as chunker from './chunker';
import * as queries from './queries';
import * as Fuse from 'fuse.js';
import * as userDb from './userdb';
import * as youtube from './youtube';
import * as cors from 'cors';
import { ADDRESS, SSL, SETPORT, KEY, CERT } from './config';
import { logger } from './logger';
import * as compression from 'compression';
import * as https from 'https';

//const cors = require('cors');

const PORT = process.env.PORT || SETPORT;




//const ADDRESS = "http://localhost:8060/";
//const ADDRESS = "https://grateful-dead-api.herokuapp.com/";
const SEARCHJSON = JSON.parse(fs.readFileSync('data/json/search.json', 'utf8'));
const RECORDINGDICT = JSON.parse(fs.readFileSync('data/json/recording_dict.json', 'utf8'));
const SONGDICT = JSON.parse(fs.readFileSync('data/json/song_dict.json', 'utf8'));

var options = {
  shouldSort: true,
  tokenize: true,
  matchAllTokens: true,
  threshold: 0.1,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: [
    "songs",
    "venue.location",
    "venue.name",
    "date",
    "name",
    "location"
  ]
};

var fuse = new Fuse(SEARCHJSON, options);

let app = express();

//const app = require('express')();



app.options('*', cors());
app.use(
    cors({
        credentials: true,
        origin: true
    })
);

app.use(compression())

var server;
var htt;

if (SSL) {
  server = https.createServer({
    //key: fs.readFileSync('ssl/server.key'),
    //cert: fs.readFileSync('ssl/server.cert')
    cert: fs.readFileSync(CERT),
    key: fs.readFileSync(KEY)
  }, app);
  htt = 'https'
  
}

else {
  server = require('http').Server(app);
  htt = 'http'
}
server.listen(PORT,  async () => {
  await store.isReady();
  await userDb.connect();
  console.log('grateful dead server started at ' + htt + '://localhost:' + PORT)
})

//const http = require('http').Server(app);


//const io = require('socket.io')(http);
//io.origins('*:*');


/*

http.listen(PORT, async () => {
  await store.isReady();
  await userDb.connect();
  logger('grateful dead server started at http://localhost:' + PORT);
});

*/



var userCount = 0;

var io = require('socket.io')(server);

io.on('connection', (socket) => {
  logger('a user connected');
  userCount++;
  console.log('connected users: ' + userCount);
  socket.on('disconnect', () => {
    userCount--;
    console.log('connected users: ' + userCount);
    logger('user disconnected');
  });

  let previousRoom;
  socket.on('joinroom', function(currentRoom) {
    if (previousRoom) {
      logger('leave: ' + previousRoom);
      socket.leave(previousRoom);
    }
    socket.leave(previousRoom);
    logger('join: ' + currentRoom);
    socket.join(currentRoom);
    previousRoom = currentRoom;
  });

  //socket.on('leaveroom', function(room) {
  //  logger('leave: ' + room);
  //  socket.leave(room);
  //  previousRoom = null;
  //});

  // https://www.digitalocean.com/community/tutorials/angular-socket-io
  
  
  socket.on('postAddComment', msg => {
    logger(msg.payload.msg)
    socket.to(msg.room).emit('addcomment', msg.payload);
  });

 
  socket.on('postDeleteComment', msg => {
    logger(msg)
    socket.to(msg.room).emit('deletecomment', msg.msgId);
  });

  socket.on('end', () => {
    logger('END');
    socket.disconnect();
  })

  socket.on('postLike', msg => {
    logger(msg)
    socket.to(msg.room).emit('like', msg.msg);
  });


});




/*
app.use((_, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
*/

/*
app.get('/socket', (req, res) => {
  logger('SOCKET')
  io.on('connection', (socket) => {
    logger('a user connected');
    socket.on('disconnect', () => {
      logger('user disconnected');
    });
  
    socket.on('comment', (msg) => {
      logger('comment: ' + msg);
      io.emit('broadcast comment', `server: ${msg}`);
    });
  });
  }
);
*/

app.get('/coordinates', (_, res) =>
  res.send(queries.getAllCoordinates())
);

app.get('/tours', (_, res) =>
  res.send(queries.getTours())
);

app.get('/events', (_, res) =>
  res.send(queries.getAllEventInfos())
);

app.get('/details', async (req, res) =>
  res.send(await queries.getEventDetails(<string> req.query.event))
);

app.get('/venue', async (req, res) =>
  res.send(await queries.getVenue(<string> req.query.id))
);

app.get('/location', async (req, res) =>
  res.send(await queries.getLocation(<string> req.query.id))
);

app.get('/setlist', (req, res) => {
  res.send(queries.getSetlist(<string> req.query.event));
});

app.get('/song', (req, res) => {
  //userDb.getSongsById(req.query.id);
  res.send(queries.getSongDetails(<string> req.query.id));
});

app.get('/artist', async (req, res) => {
  res.send(await queries.getArtistDetails(<string> req.query.id));
});

app.get('/recording', async (req, res) => {
  //await userDb.getTracklist(req.query.id);
  res.send(await queries.getRecordingDetails(<string> req.query.id));
});

app.get('/tracks', async (req, res) => {
  res.send(await queries.getTracksForRecording(<string> req.query.id));
});
/*
app.get('/feature', async (req, res) => {
  res.send(await features.loadFeature(<string> req.query.songid, <string> req.query.feature));
});

app.get('/featuresummary', async (req, res) => {
  let audio = <string> req.query.audiouri;
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
  const fromSecond = req.query.fromsecond ? parseFloat(<string> req.query.fromsecond) : 0;
  const toSecond = req.query.tosecond ? parseFloat(<string> req.query.tosecond) : 120;
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
  res.send(await queries.getDiachronicSongDetails(<string> songname, <number> count, <number> skip));
});

/*
if (SSL) {
  https.createServer({
    key: fs.readFileSync('ssl/server.key'),
    cert: fs.readFileSync('ssl/server.cert')
  }, app)
  .listen(PORT,  async () => {
    await store.isReady();
    await userDb.connect();
    logger('grateful dead server started at https://localhost:' + PORT)
  })
}
else {
  app.listen(PORT, async () => {
    await store.isReady();
    await userDb.connect();
    logger('grateful dead server started at http://localhost:' + PORT);
    //userDb.testpost("5eb1880a6636510be9f970c5");
    //logger(JSON.stringify(await queries.getTracksForRecording('recording_aade498bc5ce490c98785a67f88cbfd9')))
    //logger(JSON.stringify((await queries.getEventDetails(_.sample(queries.getAllEventInfos()).id)).recordings));
    //logger(await queries.getNews2(id))
    //logger(queries.getDiachronicSongDetails('Looks Like Rain'));
    //const AUDIO_URI = 'http://archive.org/download/gd1969-11-08.sbd.wise.17433.shnf/gd69-11-08d1t02.mp3';
    //logger(await store.getEventId('gd1969-11-08.sbd.wise.17433.shnf'))
    //logger(await store.getEventId('gd1969-11-02.sbd.miller.32273.flac16'))
    //logger(await store.getEventId('d1969-11-07.sbd.kaplan.21762.shnf'))
    //logger(await chunker.getMp3Chunk(AUDIO_URI, 0, 30));
    //features.correctSummarizedFeatures();
    //chunker.pipeMp3Chunk(AUDIO_URI, 10, 12, null);
    //logger(await features.loadFeature('gd66-01-08.d1t45', 'beats'));
    //logger(await features.getDiachronicVersionsAudio('goodlovin', 10));
    //logger(await features.loadSummarizedFeatures('http://archive.org/download/gd1969-11-08.sbd.wise.17433.shnf/gd69-11-08d1t02.mp3'))
    //logger(await features.loadSummarizedFeatures('goodlovin', 'gd1969-11-21.set2.sbd.gmb.96580.flac16/gd1969-11-21t01.mp3'));
  });
}
*/

app.get('/search', function(req, res){
  //logger(req.query.q)
  var result = fuse.search(<string> req.query.q);
  res.send(result);
});

app.get('/addBookmark', function(req, res){
  logger(req.query.userid);
  logger(req.query.route);
  logger(req.query.time);
  logger(req.query.title);
  userDb.addBookmark(req.query.userid, req.query.route, req.query.time, req.query.title);
  res.send('addBookmark');
});

app.get('/delBookmark', function(req, res){
  logger(req.query.userid);
  logger(req.query.route);
  userDb.delBookmark(req.query.userid, req.query.route);
  res.send('delBookmark');
});

app.get('/getBookmarks', function(req, res){
  //logger(req.query.userid);
  userDb.getBookmarks(req.query.userid).then(o => res.send(o));
});

app.get('/checkBookmark', function(req, res){
  //logger(req.query.userid);
  userDb.checkBookmark(req.query.userid, req.query.route).then(o => res.send(o));
});



app.get('/like', function(req, res){
  logger(req.query.userid);
  logger(req.query.route);
  logger(req.query.time);
  logger(req.query.title);
  userDb.like(req.query.userid, req.query.route, req.query.time, req.query.title);
  res.send('like');
});

app.get('/unlike', function(req, res){
  logger(req.query.userid);
  logger(req.query.route);
  userDb.unlike(req.query.userid, req.query.route);
  res.send('unlike');
});

app.get('/checkLike', function(req, res){
  //logger(req.query.userid);
  userDb.checkLike(req.query.userid, req.query.route).then(o => res.send(o));
});

app.get('/countLikes', function(req, res){
  //logger(req.query.userid);
  userDb.countLikes(req.query.route).then(o => res.send(o));
});

app.get('/getLikes', function(req, res){
  //logger(req.query.userid);
  userDb.getLikes(req.query.userid).then(o => res.send(o));
});


app.get('/getComments', function(req, res){
  userDb.getComments(req.query.route).then(o => res.send(o));
});

app.get('/addComment', function(req, res){
  //var j = JSON.parse(req.query.comment+'')
  //logger(j)
  logger(req.query.comment)
  userDb.addComment(req.query.comment, req.query.route, req.query.userid, req.query.title);
  res.send('addComment');
});

app.get('/checkComment', function(req, res){
  //logger(req.query.msgId);
  userDb.checkComment(req.query.msgId).then(o => res.send(o));
});

app.get('/getUserComments', function(req, res){
  //logger(req.query.userid);
  userDb.getUserComments(req.query.userid).then(o => res.send(o));
});

app.get('/sendCommentReport', function(req, res){
  //console.log("send feedback");
  userDb.sendCommentReport(req.query.comment, req.query.userid).then(o => res.send(o));
});

app.get('/sendFeedback', function(req, res){
  userDb.sendFeedback(req.query.comment, req.query.userid).then(o => res.send(o));
});

app.get('/addPlaylist', function(req, res){
  userDb.addPlaylist(req.query.name, req.query.playlist, req.query.playlistid, req.query.userid, req.query.time);
  res.send('addPlaylist');
});

app.get('/getPlaylists', function(req, res){
  userDb.getPlaylists(req.query.userid).then(o => res.send(o));
});

app.get('/getPlaylist', function(req, res){
  userDb.getPlaylist(req.query.playlistid).then(o => res.send(o));
});

app.get('/delPlaylist', function(req, res){
  userDb.delPlaylist(req.query.userid, req.query.playlistid);
  res.send('delPlaylist');
});

app.get('/deleteComment', function(req, res){
  userDb.deleteComment(req.query.msgid, req.query.userid);
  res.send('deleteComment');
});

app.get('/getRecordingInfo', function(req, res){
  const etree_id = RECORDINGDICT[<string> req.query.recordingid];
  queries.getRecordingInfo(<string> req.query.recordingid, etree_id).then(o => res.send(o)); 
});

app.get('/getTracklist', function(req, res){
  const etree_id = RECORDINGDICT[<string> req.query.recordingid];
  userDb.getTracklist(etree_id).then(l => {
    l.forEach(t => {
      if (t.song) {
        var songlist = [];
        t.song.forEach(s => songlist.push({ 'song_name': s, 'song_id': SONGDICT[s] }));
        //t.song.forEach(s => songlist.push({ 'song_name': s, 'song_id': store.getSongId }));
      };
      t.song = songlist;
    });
    res.send(l)}
    );  
});

app.get('/youtube', function(req, res){
  youtube.getYouTubeList(req.query.id, req.query.searcharray).then(o => res.send(o)); 
});

app.get('/showindex', async function(_, res){
  res.send(await queries.getShowIndex());
});

app.get('/venueindex', async function(_, res){
  res.send(await queries.getVenueIndex());
});

app.get('/locationindex', async function(_, res){
  res.send(await queries.getLocationIndex());
});

app.get('/songindex', async function(_, res){
  res.send(await queries.getSongIndex());
});

app.get('/numberofusers', async function(_, res){
  res.send(await userDb.getNumberofUsers());
});