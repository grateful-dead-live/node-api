const fs = require('fs');
const _ = require('lodash');
const N3 = require('n3');

const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const TYPE = RDF+"type";
const FIRST = RDF+"first";
const REST = RDF+"rest";
const NIL = RDF+"nil";
const LABEL = "http://www.w3.org/2000/01/rdf-schema#label";
const SAMEAS = "http://www.w3.org/2002/07/owl#sameAs";
const EVENT = "http://purl.org/NET/c4dm/event.owl#";
const TIME = EVENT+"time";
const SUBEVENT = EVENT+"sub_event";
const DATE = "http://purl.org/NET/c4dm/timeline.owl#atDate";
const MO = "http://purl.org/ontology/mo/";
const SINGER = MO+"singer";
const PERFORMER = MO+"performer";
const INSTRUMENT = MO+"instrument";
const MIT = "http://purl.org/ontology/mo/mit#";
const QUDT = "http://qudt.org/schema/qudt#";
const NUMVAL = QUDT+"numericValue";
const GD = "http://example.com/grateful_dead/vocabulary/";
const LOCATION = GD+"location";
const WEATHER = GD+"weather";
const MAX_TEMP = GD+"maximum_temperature";
const MIN_TEMP = GD+"minimum_temperature";
const PRECIPITATION = GD+"precipitation";
const VENUE = GD+"venue";
const SETLIST = GD+"set_list";

const store = N3.Store();
readRdfIntoStore('rdf/event_main.ttl')
  .then(() => readRdfIntoStore('rdf/dbpedia_venues_new1.ttl'))
  .then(() => readRdfIntoStore('rdf/testsong_new.ttl'))
  .then(() => readRdfIntoStore('rdf/lineup_artists.ttl'))
  .then(() => readRdfIntoStore('rdf/lineup_file_resources.ttl'));

exports.getEventIds = function() {
  return store.getTriples(null, LOCATION).map(t => t.subject);//getSubjects doesnt seem to work :(
}

exports.getTime = function(eventId) {
  return getObject(getObject(eventId, TIME), DATE);
}

exports.getLocation = function(eventId) {
  return getObject(eventId, LOCATION);
}

exports.getWeather = function(eventId) {
  let weather = getObject(eventId, WEATHER);
  return {
    maxTemperature: parseFloat(getObject(getObject(weather, MAX_TEMP), NUMVAL)),
    minTemperature: parseFloat(getObject(getObject(weather, MIN_TEMP), NUMVAL)),
    precipitation: parseFloat(getObject(getObject(weather, PRECIPITATION), NUMVAL)),
  };
}

exports.getVenue = function(eventId) {
  return getObject(eventId, VENUE);
}

exports.getSetlist = function(eventId) {
  return getList(getObject(eventId, SETLIST)).map(s => getObject(s, LABEL));
}

exports.getPerformers = function(eventId) {
  let performers = store.getObjects(getObject(eventId, SUBEVENT), SUBEVENT);
  performers = performers.map(p => {
    let singer = getObject(p, SINGER);
    let musician = singer ? singer : getObject(p, PERFORMER);
    let instrument = singer ? MIT+"Voice" : getObject(p, INSTRUMENT);
    return {
      name: getObject(musician, LABEL),
      instrument: instrument.replace(MIT, ''),
      sameAs: getObject(musician, SAMEAS)
    }
  });
  //join same performers
  performers = _.chain(performers).groupBy('name')
    .mapValues((v,k) => ({
      name: k,
      instruments: v.map(p => p.instrument),
      sameAs: v[0].sameAs
    })).value();
  return _.values(performers).filter(p => p.name != 'undefined');
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

function getList(list) {
  let elements = [];
  while (list != NIL) {
    elements.push(getObject(list, FIRST));
    list = getObject(list, REST);
  }
  return elements;
}