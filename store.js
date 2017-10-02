const fs = require('fs');
const N3 = require('n3');

const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const TYPE = RDF+"type";
const FIRST = RDF+"first";
const REST = RDF+"rest";
const NIL = RDF+"nil";
const LABEL = "http://www.w3.org/2000/01/rdf-schema#label";
const SAMEAS = "http://www.w3.org/2002/07/owl#sameAs";
const TIME = "http://purl.org/NET/c4dm/event.owl#time";
const DATE = "http://purl.org/NET/c4dm/timeline.owl#atDate";
const GD = "http://example.com/grateful_dead/vocabulary/";
const LOCATION = GD+"location";
const VENUE = GD+"venue";
const SETLIST = GD+"set_list";

const store = N3.Store();
readRdfIntoStore('rdf/event_main.ttl')
  .then(() => readRdfIntoStore('rdf/dbpedia_venues_new1.ttl'))
  .then(() => readRdfIntoStore('rdf/testsong_new.ttl'));

exports.getEventIds = function() {
  return store.getTriples(null, LOCATION).map(t => t.subject);//getSubjects doesnt seem to work :(
}

exports.getTime = function(eventId) {
  return getObject(getObject(eventId, TIME), DATE);
}

exports.getLocation = function(eventId) {
  return getObject(eventId, LOCATION);
}

exports.getSetlist = function(eventId) {
  let rest = getObject(eventId, SETLIST);
  let setlist = [];
  while (rest != NIL) {
    setlist.push(getObject(rest, FIRST));
    rest = getObject(rest, REST);
  }
  return setlist.map(s => getObject(s, LABEL));
}

exports.getVenue = function(eventId) {
  return getObject(eventId, VENUE);
}

exports.getLabel = function(id) {
  return getObject(id, LABEL);
}

exports.getSameAs = function(id) {
  return getObject(id, SAMEAS);
}

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