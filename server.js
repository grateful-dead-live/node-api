const fs = require('fs');
const express = require('express');
const N3 = require('n3');

const PORT = 8060;
const TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const LOCATION = "http://example.com/grateful_dead/vocabulary/location";
const TIME = "http://purl.org/NET/c4dm/event.owl#time";

const app = express();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const store = N3.Store();
fs.readFile('rdf/event_main.ttl', 'utf8', (err, data) => {
  N3.Parser().parse(data, (error, triple, prefixes) => {
    triple ? store.addTriple(triple) : (error ? console.log(error) : null);
  });
});

app.get('/events', (req, res) => {
  res.send(store.getTriples(null, LOCATION).map(t => t.subject));
});

app.get('/locations', (req, res) => {
  res.send(store.getObjects(null, LOCATION));
});

app.get('/times', (req, res) => {
  res.send(store.getObjects(null, TIME));
});

app.listen(PORT, () => {
  console.log('Audio server started at http://localhost:' + PORT);
});