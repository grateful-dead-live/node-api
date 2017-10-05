const express = require('express');
const store = require('./store');
const dbpedia = require('./dbpedia');

const PORT = 8060;

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
    if (!venue.name) { //it exists in dbpedia
      venue["name"] = venue.id.replace('http://dbpedia.org/resource/', '');
      venue["image"] = await dbpedia.getImage(venue.id);
      venue["comment"] = await dbpedia.getComment(venue.id);
    }
    res.send(venue);
  }
});

app.get('/location', async (req, res) => {
  let location = store.getLocation(req.query.event);
  if (location) {
    res.send({
      name: location.replace('http://dbpedia.org/resource/', ''),
      image: await dbpedia.getImage(location),
      comment: await dbpedia.getComment(location)
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

app.get('/setlist', (req, res) => {
  res.send(store.getSetlist(req.query.event));
});

app.get('/recordings', (req, res) => {
  res.send(store.getRecordings(req.query.event));
});

app.get('/performers', async (req, res) => {
  let performers = store.getPerformers(req.query.event);
  res.send(await Promise.all(performers.map(async p => {
    p["image"] = await dbpedia.getImage(p.sameAs);
    return p
  })));
});

app.listen(PORT, () => {
  console.log('grateful dead server started at http://localhost:' + PORT);
});