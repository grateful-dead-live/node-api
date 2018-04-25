const express = require('express');
const store = require('./store');
const dbpedia = require('./dbpedia');
const etree = require('./etree');


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
  console.log(req.query.recording)
  let e = await etree.getInfoFromEtree(req.query.recording)
  .then(e => res.send(e));
});


app.listen(PORT, () => {
  console.log('grateful dead server started at http://localhost:' + PORT);
});