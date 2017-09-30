const fs = require('fs');
const express = require('express');
const N3 = require('n3');
const dbpedia = require('./dbpedia')

const PORT = 8060;
const TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const LABEL = "http://www.w3.org/2000/01/rdf-schema#label";
const SAMEAS = "http://www.w3.org/2002/07/owl#sameAs";
const LOCATION = "http://example.com/grateful_dead/vocabulary/location";
const VENUE = "http://example.com/grateful_dead/vocabulary/venue";
const TIME = "http://purl.org/NET/c4dm/event.owl#time";
const DATE = "http://purl.org/NET/c4dm/timeline.owl#atDate";


const app = express();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const store = N3.Store();
readRdfIntoStore('rdf/event_main.ttl')
.then(() => readRdfIntoStore('rdf/dbpedia_venues_new1.ttl'));

//dbpedia.getImage('dbr:London').then(t => console.log(t))

app.get('/events', (req, res) => {
  res.send(store.getTriples(null, LOCATION).map(t => ({
    id: t.subject,
    date: getObject(getObject(t.subject, TIME), DATE),
    location: getObject(t.subject, LOCATION).replace('http://dbpedia.org/resource/', '')
  })));
});

app.get('/venue', (req, res) => {
  let venue = getObject(req.query.event, VENUE);
  if (venue) {
    let label = getObject(venue, LABEL);
    let dbpediaVenue = getObject(venue, SAMEAS);
    dbpedia.getImage(dbpediaVenue.replace('http://dbpedia.org/resource/', 'dbr:'))
      .then(i => res.send({
        name: label,
        sameas: dbpediaVenue.replace('http://dbpedia.org/resource/', ''),
        image: i
      }));
  }
});

app.get('/location', (req, res) => {
  let location = getObject(req.query.event, LOCATION);
  if (location) {
    dbpedia.getImage(location.replace('http://dbpedia.org/resource/', 'dbr:'))
      .then(i => res.send({
        name: location.replace('http://dbpedia.org/resource/', ''),
        image: i
      }));
  }
});

app.listen(PORT, () => {
  console.log('grateful dead server started at http://localhost:' + PORT);
});

function readRdfIntoStore(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      N3.Parser().parse(data, (error, triple, prefixes) => {
        if (triple) {
          store.addTriple(triple);
        } else if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  });
}

function getObject(subject, predicate) {
  let object = store.getObjects(subject, predicate)[0];
  if (N3.Util.isLiteral(object)) {
    return N3.Util.getLiteralValue(object);
  }
  return object;
}