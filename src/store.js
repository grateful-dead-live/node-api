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
const WIND = GD+"wind";
const WIND_DIRECTION = GD+"wind_direction";
const WEATHER_CONDITION = GD+"weather_condition";
const VENUE = GD+"venue";
const SETLIST = GD+"set_list";
const ARTEFACT = GD+"artefact";
const POSTER = GD+"Poster";
const TICKET = GD+"Ticket";
const PASS = GD+"BackstagePass";
const DEPICTS = GD+"depicts";
const IMAGE = GD+"image_file";
const PERFORMANCE = GD+"etree_performance";
const PLAYED_AT = GD+"played_at";
const ETREE_PERFORMANCE = 'http://etree.linkedmusic.org/performance/';

const weatherDict = {
  'clear': 'wi-day-sunny',
  'drizzle': 'wi-sprinkle',
  'fog': 'wi-fog',
  'light drizzle': 'wi-sprinkle',
  'light freezing drizzle': 'wi-sleet',
  'light rain': 'wi-sprinkle',
  'light rain showers': 'wi-showers',
  'light snow': 'wi-snow',
  'light snow showers': 'wi-snow',
  'mostly cloudy': 'wi-cloud',
  'overcast': 'wi-cloudy',
  'partly cloudy': 'wi-day-cloudy-high',
  'rain': 'wi-rain',
  'rain showers': 'wi-showers',
  'scattered clouds': 'wi-day-cloudy',
  'smoke': 'wi-smoke',
  'snow': 'wi-snow',
  'thunderstorms and rain': 'wi-thunderstorm'
};

const windDict = { 
  'ENE': 'wi-direction-down-left',
  'ESE': 'wi-direction-up-left',
  'NE': 'wi-direction-down-left',
  'NNE': 'wi-direction-down-left',
  'NNW': 'wi-direction-down-right',
  'NW': 'wi-direction-down-right',
  'SE': 'wi-direction-up-left',
  'SSE': 'wi-direction-up-left',
  'SSW': 'wi-direction-up-right',
  'SW': 'wi-direction-up-right',
  'WNW': 'wi-direction-down-right',
  'WSW': 'wi-direction-up-right'
};


const store = N3.Store();
exports.isReady = readRdfIntoStore('rdf-data/event_main.ttl')
  .then(() => readRdfIntoStore('rdf-data/dbpedia_venues.ttl'))
  .then(() => readRdfIntoStore('rdf-data/songs.ttl'))
  .then(() => readRdfIntoStore('rdf-data/songs_inverse.ttl'))
  .then(() => readRdfIntoStore('rdf-data/lineup_artists.ttl'))
  .then(() => readRdfIntoStore('rdf-data/lineup_file_resources.ttl'))
  .then(() => readRdfIntoStore('rdf-data/tickets.ttl'))
  .then(() => readRdfIntoStore('rdf-data/posters.ttl'));

exports.getEventIds = function() {
  return store.getTriples(null, LOCATION).map(t => t.subject);//getSubjects doesnt seem to work :(
}

exports.getTime = function(eventId) {
  //console.log(eventId);
  return getObject(getObject(eventId, TIME), DATE);
}


exports.getSubeventInfo = function(performanceId) {
  let event_id = getSubject(SUBEVENT, performanceId);
  let location = exports.getLocation(event_id);
  if (location != null){
    location = location.replace('http://dbpedia.org/resource/', '');
  }
  return {
    id: event_id,
    date: exports.getTime(event_id),
    location: location
  };
}

exports.getEventInfo = function(eventId) {
  let location = exports.getLocation(eventId);
  if (location != null){
    location = location.replace('http://dbpedia.org/resource/', '').replace(/_/g, ' ');
  }
  let venue = exports.getVenue(eventId);
  if (venue != null){
    venue = venue.replace('http://dbpedia.org/resource/', '').replace(/_/g, ' ');
  }
  return {
    id: eventId,
    date: exports.getTime(eventId),
    location: location,
    venue: venue
  };
}


exports.getLocationEvents = function(locationId) {
  return store.getTriples(null, LOCATION, locationId).map(t => t.subject);
}

exports.getVenueEvents = function(venueId) {
  return store.getTriples(null, VENUE, venueId).map(t => t.subject);
}


exports.getLocation = function(eventId) {
  return getObject(eventId, LOCATION);
}


exports.getWeather = function(eventId) {
  let weather = getObject(eventId, WEATHER);
  let windDirection = getObject(weather, WIND_DIRECTION);
  let condition = getObject(weather, WEATHER_CONDITION);
  return {
    maxTemperature: Math.round(parseFloat(getObject(getObject(weather, MAX_TEMP), NUMVAL)) * 9/5 + 32),
    minTemperature: parseFloat(getObject(getObject(weather, MIN_TEMP), NUMVAL)),
    precipitation: (parseFloat(getObject(getObject(weather, PRECIPITATION), NUMVAL)) / 25.4).toFixed(2),
    wind: Math.round(parseFloat(getObject(getObject(weather, WIND), NUMVAL)) * 1.609),
    windDirection: windDirection,
    windDirectionIcon: windDict[windDirection],
    condition: condition,
    conditionIcon: weatherDict[condition] || "wi-na"
  };
}

exports.getVenue = function(eventId) {
  return getObject(eventId, VENUE);
}

exports.getRecordings = function(eventId) {
  return store.getObjects(getObject(eventId, SUBEVENT), PERFORMANCE)
    .map(p => p.replace(ETREE_PERFORMANCE, ''));
}

exports.getEventId = function(recording) {
  const subevent = getSubject(PERFORMANCE, ETREE_PERFORMANCE+recording);
  return getSubject(SUBEVENT, subevent);
}

exports.getPosters = function(eventId) {
  return getArtefacts(eventId, POSTER);
}

exports.getTickets = function(eventId) {
  return getArtefacts(eventId, TICKET);
}

exports.getPasses = function(eventId) {
  return getArtefacts(eventId, PASS);
}

function getArtefacts(eventId, type) {
  return store.getObjects(eventId, ARTEFACT)
    .filter(a => getObject(a, TYPE) === type)
    .map(p => store.getTriples(null, DEPICTS, p)[0])
    .map(t => t.subject)
    .map(t => getObject(t, IMAGE));
}

exports.getSongEvents = function(songId) {
  return store.getTriples(songId, PLAYED_AT).map(t => t.object);
}

exports.getSongLabel = function(songId) {
  return getObject(songId, LABEL)
}

exports.getSetlist = function(eventId) {
  return getList(getObject(getObject(eventId, SUBEVENT), SETLIST));
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

function getSubject(predicate, object) {
  return store.getSubjects(predicate, object)[0];
}

/*
function _getList(list) {
  let elements = [];
  while (list != NIL) {
    elements.push(getObject(list, FIRST));
    list = getObject(list, REST);
  }
  return elements;
}
*/

function getList(seq) {
  let elements = [];
  let i = 0;
  while (true) {
    i++;
    var songid = getObject(seq, RDF + "_" + i);
    if (songid != null){
      elements.push(songid);
    }
    else { break; }
  }

  return elements;
}
