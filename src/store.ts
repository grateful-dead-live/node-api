import * as fs from 'fs';
import * as _ from 'lodash';
import * as N3 from 'n3';
import { DeadEventInfo, Weather, Performer } from './types';

const LMO = "https://w3id.org/lmo/vocabulary/";
const LMO_LOCATION = LMO+"location";
const LMO_SHOW = LMO+"LiveMusicShow";
const LMO_VENUE = LMO+"venue";
const LMO_VENUE_NAME = LMO+"venue_name";
const LMO_RECORDING_OF = LMO+"recording_of";
const LMO_ETREE_ID = LMO+"etree_id";
const LMO_ARTEFACT = LMO+"artefact";
const LMO_DEPICTS = LMO+"depicts";
const LMO_THUMBNAIL = LMO+"image_thumbnail";
const LMO_IMAGE = LMO+"image_file";
const LMO_PLAYED_AT = LMO+"played_at";
const LMO_DBPEDIA = LMO+"dbpedia";
const LMO_SONG_NAME = LMO+"song_name";
const LMO_TIME = LMO+"time";
const LMO_MAX_TEMP = LMO+"maximum_temperature";
const LMO_MIN_TEMP = LMO+"minimum_temperature";
const LMO_PRECIPITATION = LMO+"precipitation";
const LMO_WIND = LMO+"wind";
const LMO_WIND_DIRECTION = LMO+"wind_direction";
const LMO_WEATHER_CONDITION = LMO+"weather_condition";
const LMO_SETLIST = LMO+"set_list";
const LMO_POSTER = LMO+"Poster";
const LMO_PHOTO = LMO+"Photo";
const LMO_TICKET = LMO+"Ticket";
const LMO_BACKSTAGEPASS = LMO+"BackstagePass";
const LMO_ENVELOPE = LMO+"Envelope";

const TIME = "http://www.w3.org/2006/time#"
const TIME_HAS_DATE_TIME_DESCRIPTION = TIME+"hasDateTimeDescription"
const TIME_YEAR = TIME+"year";
const TIME_MONTH = TIME+"month";
const TIME_DAY = TIME+"day";

const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const RDF_TYPE = RDF+"type";
const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label"
const FOAF_NAME = "http://xmlns.com/foaf/0.1/name"

const EVENT = "http://purl.org/NET/c4dm/event.owl#";
const EVENT_TIME = EVENT+"time";
const EVENT_SUBEVENT = EVENT+"sub_event";
const TL_AT_DATE = "http://purl.org/NET/c4dm/timeline.owl#atDate";
const MO = "http://purl.org/ontology/mo/";
const MO_PERFORMER = MO+"performer";
const MO_INSTRUMENT = MO+"instrument";
const MO_SINGER = MO+"singer";
const MIT = "http://purl.org/ontology/mo/mit#";

const QUDT_NUMERIC_VALUE = "http://qudt.org/schema/qudt#numericValue";
const DBO = "http://dbpedia.org/ontology/";
const DBO_ISPARTOF = DBO+"isPartOf";
const DBO_COUNTRY = DBO+"country";

const WEATHER_DICT = {
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

const WIND_DICT = { 
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
  await readRdfIntoStore('rdf-data/artists.ttl');
  await readRdfIntoStore('rdf-data/deadlists.ttl');
  await readRdfIntoStore('rdf-data/events_shows_dates.ttl');
  await readRdfIntoStore('rdf-data/gdao.ttl');
  await readRdfIntoStore('rdf-data/lineups.ttl');
  await readRdfIntoStore('rdf-data/psilo.ttl');
  await readRdfIntoStore('rdf-data/recordings.ttl');
  await readRdfIntoStore('rdf-data/recording_sources.ttl');
  await readRdfIntoStore('rdf-data/setlists.ttl');
  await readRdfIntoStore('rdf-data/events_deadlists.ttl');
  await readRdfIntoStore('rdf-data/events_gdao.ttl');
  await readRdfIntoStore('rdf-data/events_psilo.ttl');
  await readRdfIntoStore('rdf-data/shows_venue.ttl');
  await readRdfIntoStore('rdf-data/songs.ttl');
  await readRdfIntoStore('rdf-data/songs_played_at.ttl');
  await readRdfIntoStore('rdf-data/states_countries.ttl');
  await readRdfIntoStore('rdf-data/venues.ttl');
  await readRdfIntoStore('rdf-data/weather.ttl');
  await readRdfIntoStore('rdf-data/datetimeobjects.ttl');
}

export function getEventIds() {
  return getSubjects(RDF_TYPE, LMO_SHOW);
}

export function getTime(eventId: string): string {
  //console.log(eventId);
  return getObject(getObject(eventId, EVENT_TIME), TL_AT_DATE);
}


export function getEventInfo(eventId: string): DeadEventInfo {
  return {
    id: eventId,
    date: getTime(eventId),
    location: getLocationNameForEvent(eventId),
    state: dbpediaToName(getStateOrCountry(getLocationForEvent(eventId))),
    venue: getVenueNameForEvent(eventId),
    tickets: getTickets(eventId),
    recordings: getRecordings(eventId)
  };
}


export function getLocationEvents(locationId: string): string[] {
  let shows = [];
  store.forSubjects((venue: string) => {
    shows = shows.concat(getSubjects(LMO_VENUE, venue));
  }, LMO_LOCATION, locationId);
  return shows;
}

export function getVenueEvents(venueId: string): string[] {
  return getSubjects(LMO_VENUE, venueId);
}

export function getStateOrCountry(locationId: string): string {
  let countryId = getObject(locationId, DBO_COUNTRY);
  let stateId = getObject(locationId, DBO_ISPARTOF);
  if (countryId != null){
    return countryId;
  } else if (stateId != null) {
    return stateId;
  }
}

export function getLocationForEvent(eventId: string): string {
  return getObject(getObject(eventId, LMO_VENUE), LMO_LOCATION);
}

export function getLocationNameForEvent(eventId: string): string {
  const name = dbpediaToName(getLocationForEvent(eventId));
  if (name) return name.split(",")[0];
}


export function getWeather(eventId: string): Weather {
  const weather = getSubject(LMO_TIME, getDateTimeInterval(eventId));
  const windDirection = getObject(weather, LMO_WIND_DIRECTION);
  const condition = getObject(weather, LMO_WEATHER_CONDITION);
  const precipitation = (parseFloat(getObject(getObject(weather, LMO_PRECIPITATION), QUDT_NUMERIC_VALUE)) / 25.4).toFixed(2) || "n/a";
  return {
    maxTemperature: Math.round(parseFloat(getObject(getObject(weather, LMO_MAX_TEMP), QUDT_NUMERIC_VALUE)) * 9/5 + 32),
    minTemperature: parseFloat(getObject(getObject(weather, LMO_MIN_TEMP), QUDT_NUMERIC_VALUE)),
    precipitation: precipitation,
    wind: Math.round(parseFloat(getObject(getObject(weather, LMO_WIND), QUDT_NUMERIC_VALUE)) * 1.609),
    windDirection: windDirection,
    windDirectionIcon: WIND_DICT[windDirection],
    condition: condition,
    conditionIcon: WEATHER_DICT[condition] || "wi-na"
  };
}

export function getVenueForEvent(eventId: string) {
  return getObject(eventId, LMO_VENUE);
}

export function getVenueNameForEvent(eventId: string) {
  return getObject(getObject(eventId, LMO_VENUE), LMO_VENUE_NAME) ;
}

export function getRecordings(eventId: string): string[] {
  let recordings = [];
  store.forSubjects((recording: string) => {
    recordings = recordings.concat(store.getObjects(recording, LMO_ETREE_ID));
  }, LMO_RECORDING_OF, eventId);
  recordings.forEach(function (recording, i) {
    recordings[i] = recording.replace(/"/g, '');    // why?
  });
  return recordings;
}

export function getEventId(recording: string): string {
  return getObject(recording, LMO_RECORDING_OF);
}

export function getPosters(eventId: string): string[] {
  return getArtefacts(eventId, LMO_POSTER);
}

export function getPhotos(eventId: string): string[] {
  return getArtefacts(eventId, LMO_PHOTO);
}

export function getEnvelopes(eventId: string): string[] {
  return getArtefacts(eventId, LMO_ENVELOPE);
}

export function getTickets(eventId: string): string[] {
  return getArtefacts(eventId, LMO_TICKET);
}

export function getPasses(eventId: string): string[] {
  return getArtefacts(eventId, LMO_BACKSTAGEPASS);
}

function getArtefacts(eventId: string, type: string): string[] {
  return store.getObjects(getSubject(EVENT_SUBEVENT, eventId), LMO_ARTEFACT)
    .filter(a => getObject(a, RDF_TYPE) === type)
    .map(p => store.getTriples(null, LMO_DEPICTS, p)[0])
    .map(t => t.subject)
    .map(t => getObject(t, LMO_THUMBNAIL) || getObject(t, LMO_IMAGE));
}

export function getSongEvents(songId: string): string[] {
  return store.getObjects(songId, LMO_PLAYED_AT);
}

export function getSongLabel(songId: string): string {
  return getObject(songId, LMO_SONG_NAME);
}

export function getSetlist(eventId: string): string[] {
  return getList(getObject(eventId, LMO_SETLIST));
}

export function getPerformers(eventId: string): Performer[] {
  let performers = store.getObjects(eventId, EVENT_SUBEVENT);
  performers = performers.map(p => {
    let singer = getObject(p, MO_SINGER);
    let musician = singer ? singer : getObject(p, MO_PERFORMER);
    let instrument = singer ? MIT+"Voice" : getObject(p, MO_INSTRUMENT);
    return {
      name: getObject(musician, FOAF_NAME),
      instrument: instrument.replace(MIT, ''),
      sameAs: getObject(musician, LMO_DBPEDIA)
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

export function getLabel(id: string): string {
  return getObject(id, RDFS_LABEL);
}

export function getSameAs(id: string): string {
  return getObject(id, LMO_DBPEDIA);
}

function readRdfIntoStore(path: string) {
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

export function getObject(subject: string, predicate: string) {
  if (subject && predicate) {
    let object = store.getObjects(subject, predicate)[0];
    if (N3.Util.isLiteral(object)) {
      return N3.Util.getLiteralValue(object);
    }
    return object;
  };
}

function getSubject(predicate: string, object: string) {
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

export function dbpediaToName(resource: string): string {
  if (resource) return resource
    .replace('http://dbpedia.org/resource/', '').replace(/_/g, ' ');
}

function getSubjects(predicate: string, object: string): string[] { 
  //store.getSubjects doesnt seem to work :(
  return store.getTriples(null, predicate, object).map(t => t.subject);
}

function getDateTimeInterval(eventId: string) {
  const showDate = getTime(eventId).split("-");
  let triples = store.getTriples(null, TIME_HAS_DATE_TIME_DESCRIPTION, null);
  triples = triples.filter(function(triple){
    return getObject(triple.object, TIME_YEAR) == showDate[0];
  }); 
  triples = triples.filter(function(triple){
    return getObject(triple.object, TIME_MONTH) == "--" + showDate[1];
  });  
  triples = triples.filter(function(triple){
    return getObject(triple.object, TIME_DAY) == "---" + showDate[2]; 
  }); 
  return triples[0].subject
}