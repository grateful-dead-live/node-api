const express = require('express');
const store = require('./store')
const dbpedia = require('./dbpedia')

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

app.get('/venue', (req, res) => {
  let venue = store.getVenue(req.query.event);
  if (venue) {
    let label = store.getLabel(venue);
    let dbpediaVenue = store.getSameAs(venue);
    dbpedia.getImage(dbpediaVenue.replace('http://dbpedia.org/resource/', 'dbr:'))
      .then(i => res.send({
        name: label,
        sameas: dbpediaVenue.replace('http://dbpedia.org/resource/', ''),
        image: i
      }));
  }
});

app.get('/location', (req, res) => {
  let location = store.getLocation(req.query.event);
  if (location) {
    dbpedia.getImage(location.replace('http://dbpedia.org/resource/', 'dbr:'))
      .then(i => res.send({
        name: location.replace('http://dbpedia.org/resource/', ''),
        image: i
      }));
  }
});

app.get('/setlist', (req, res) => {
  res.send(store.getSetlist(req.query.event));
});

app.listen(PORT, () => {
  console.log('grateful dead server started at http://localhost:' + PORT);
});