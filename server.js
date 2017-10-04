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

app.get('/weather', (req, res) => {
  res.send(store.getWeather(req.query.event));
});

app.get('/setlist', (req, res) => {
  res.send(store.getSetlist(req.query.event));
});

app.get('/performers', (req, res) => {
  let performers = store.getPerformers(req.query.event);
  Promise.all(performers.map(p =>
    dbpedia.getImage(p.sameAs.replace('http://dbpedia.org/resource/', 'dbr:'))
      .then(image => p["image"] = image)
      .then(() => p)
      .catch(e => console.log("no image found for ", p.name))
  ))
  .then(ps => res.send(ps));
});

app.listen(PORT, () => {
  console.log('grateful dead server started at http://localhost:' + PORT);
});