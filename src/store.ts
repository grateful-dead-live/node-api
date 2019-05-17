import * as fs from 'fs';
import * as _ from 'lodash';
import * as N3 from 'n3';
import { DeadEventInfo } from './types';

const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const TYPE = RDF+"type";
//const FIRST = RDF+"first";
//const REST = RDF+"rest";
//const NIL = RDF+"nil";
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
const ENVELOPE = GD+"Envelope";
const DEPICTS = GD+"depicts";
const IMAGE = GD+"image_file";
const PERFORMANCE = GD+"etree_performance";
const PLAYED_AT = GD+"played_at";
const ETREE_PERFORMANCE = 'http://etree.linkedmusic.org/performance/';
const COUNTRY = 'http://dbpedia.org/ontology/country';
const STATE = 'http://dbpedia.org/ontology/isPartOf';
const THUMBNAIL = GD+"image_thumbnail" 

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

export async function isReady() {
  await readRdfIntoStore('rdf-data/event_main.ttl');
  await readRdfIntoStore('rdf-data/states_countries.ttl');
  await readRdfIntoStore('rdf-data/dbpedia_venues.ttl');
  await readRdfIntoStore('rdf-data/songs.ttl');
  await readRdfIntoStore('rdf-data/songs_inverse.ttl');
  await readRdfIntoStore('rdf-data/lineup_artists.ttl');
  await readRdfIntoStore('rdf-data/lineup_file_resources.ttl');
  await readRdfIntoStore('rdf-data/tickets.ttl');
  await readRdfIntoStore('rdf-data/posters.ttl')//;
  await readRdfIntoStore('rdf-data/gdao.ttl')
}

export function getEventIds() {
  return store.getTriples(null, LOCATION).map(t => t.subject);//getSubjects doesnt seem to work :(
}

export function getTime(eventId) {
  //console.log(eventId);
  return getObject(getObject(eventId, TIME), DATE);
}


export function getSubeventInfo(performanceId: string): DeadEventInfo {
  return getEventInfo(getSubject(SUBEVENT, performanceId));
}

export function getEventInfo(eventId: string): DeadEventInfo {
  return {
    id: eventId,
    date: getTime(eventId),
    location: getLocationNameForEvent(eventId),
    state: dbpediaToName(getStateOrCountry(getLocationForEvent(eventId))),
    venue: getVenueNameForEvent(eventId),
    tickets: getTickets(eventId)
  };
}


export function getLocationEvents(locationId: string) {
  return store.getTriples(null, LOCATION, locationId).map(t => t.subject);
}

export function getVenueEvents(venueId: string) {
  return store.getTriples(null, VENUE, venueId).map(t => t.subject);
}

export function getStateOrCountry(locationId) {
  let countryId = getObject(locationId, COUNTRY);
  let stateId = getObject(locationId, STATE);
  if (countryId != null){
    return countryId;
  } else if (stateId != null) {
    return stateId;
  }
}

export function getLocationForEvent(eventId: string) {
  return getObject(eventId, LOCATION);
}

export function getLocationNameForEvent(eventId: string) {
  return dbpediaToName(getLocationForEvent(eventId)).split(",")[0];
}


export function getWeather(eventId) {
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

export function getVenueForEvent(eventId: string) {
  return getObject(eventId, VENUE);
}

export function getVenueNameForEvent(eventId: string) {
  return dbpediaToName(getVenueForEvent(eventId));
}

export function getRecordings(eventId) {
  return store.getObjects(getObject(eventId, SUBEVENT), PERFORMANCE)
    .map(p => p.replace(ETREE_PERFORMANCE, ''));
}

export function getEventId(recording) {
  const subevent = getSubject(PERFORMANCE, ETREE_PERFORMANCE+recording);
  return getSubject(SUBEVENT, subevent);
}

export function getPosters(eventId) {
  return getArtefacts(eventId, POSTER);
}

export function getEnvelopes(eventId) {
  return getArtefacts(eventId, ENVELOPE);
}

export function getTickets(eventId) {
  return getArtefacts(eventId, TICKET);
}

export function getPasses(eventId) {
  return getArtefacts(eventId, PASS);
}

function getArtefacts(eventId, type) {
  return store.getObjects(eventId, ARTEFACT)
    .filter(a => getObject(a, TYPE) === type)
    .map(p => store.getTriples(null, DEPICTS, p)[0])
    .map(t => t.subject)
    .map(t => getObject(t, THUMBNAIL) || getObject(t, IMAGE));
}

export function getSongEvents(songId) {
  return store.getTriples(songId, PLAYED_AT).map(t => t.object);
}

export function getSongLabel(songId) {
  return getObject(songId, LABEL)
}

export function getSetlist(eventId) {
  return getList(getObject(getObject(eventId, SUBEVENT), SETLIST));
}

export function getPerformers(eventId) {
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

export function getLabel(id) {
  return getObject(id, LABEL);
}

export function getSameAs(id) {
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

export function dbpediaToName(resource: string) {
  if (resource) return resource
    .replace('http://dbpedia.org/resource/', '').replace(/_/g, ' ');
}

