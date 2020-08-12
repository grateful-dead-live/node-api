import * as fs from 'fs';
import * as _ from 'lodash';
import * as N3 from 'n3';
import { Weather, Artist, ArtistDetails, SongInfo, Recording, VenueDetails,
  Artifact, ArtifactType } from './types';


const LMO = "https://w3id.org/lmo/vocabulary/";
const LMO_LOCATION = LMO+"location";
const LMO_SHOW = LMO+"LiveMusicShow";
const LMO_VENUE = LMO+"venue";
const LMO_VENUE_CLASS = LMO+"Venue";
const LMO_VENUE_NAME = LMO+"venue_name";
const LMO_RECORDING_OF = LMO+"recording_of";
const LMO_REC_SOURCE = LMO+"recording_source";
const LMO_ETREE_ID = LMO+"etree_id";
const LMO_ARTEFACT = LMO+"artefact";
const LMO_DEPICTS = LMO+"depicts";
const LMO_DESCRIPTION = LMO+"description";
const LMO_THUMBNAIL = LMO+"image_thumbnail";
const LMO_IMAGE = LMO+"image_file";
const LMO_PLAYED_AT = LMO+"played_at";
const LMO_DBPEDIA = LMO+"dbpedia";
const LMO_SONG_NAME = LMO+"songname";
const LMO_COMPOSED_BY = LMO+"music_composed_by";
const LMO_LYRICS_BY = LMO+"lyrics_written_by";
const LMO_LINEUP = LMO+"lineup";
const LMO_PERFORMANCE = LMO+"lineup_performance";
const LMO_TIME = LMO+"time";
const LMO_MAX_TEMP = LMO+"maximum_temperature";
const LMO_MIN_TEMP = LMO+"minimum_temperature";
const LMO_PRECIPITATION = LMO+"precipitation";
const LMO_WIND = LMO+"wind";
const LMO_WIND_DIRECTION = LMO+"wind_direction";
const LMO_WEATHER_CONDITION = LMO+"weather_condition";
const LMO_SETLIST = LMO+"setlist";
const LMO_SETNAME = LMO+"set_name";
const LMO_POSTER = LMO+"Poster";
const LMO_PHOTO = LMO+"Photo";
const LMO_TICKET = LMO+"Ticket";
const LMO_BACKSTAGEPASS = LMO+"BackstagePass";
const LMO_ENVELOPE = LMO+"Envelope";
const LMO_TSHIRT = LMO+"TShirt";
const LMO_FANART = LMO+"FanArt";
const LMO_GDAO_ID = LMO+"gdao_id";
const LMO_TOUR = LMO+"Tour";
const LMO_TOUR_SHOW = LMO+"tour_show";
const LMO_TOUR_NAME = LMO+"tour_name";

const TIME = "http://www.w3.org/2006/time#"
const TIME_HAS_DATE_TIME_DESCRIPTION = TIME+"hasDateTimeDescription"
const TIME_YEAR = TIME+"year";
const TIME_MONTH = TIME+"month";
const TIME_DAY = TIME+"day";

const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const RDF_TYPE = RDF+"type";
const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label"
const RDFS_COMMENT = "http://www.w3.org/2000/01/rdf-schema#comment"
const FOAF_NAME = "http://xmlns.com/foaf/0.1/name"

const EVENT = "http://purl.org/NET/c4dm/event.owl#";
const EVENT_TIME = EVENT+"time";
const EVENT_SUBEVENT = EVENT+"sub_event";
const TL_AT_DATE = "http://purl.org/NET/c4dm/timeline.owl#atDate";
const MO = "http://purl.org/ontology/mo/";
const MO_PERFORMER = MO+"performer";
const MO_INSTRUMENT = MO+"instrument";
const MO_BRAINZ = MO+"musicbrainz_guid";
const MIT = "http://purl.org/ontology/mo/mit#";

const QUDT_NUMERIC_VALUE = "http://qudt.org/schema/qudt#numericValue";
const DBO = "http://dbpedia.org/ontology/";
const DBO_ISPARTOF = DBO+"isPartOf";
const DBO_COUNTRY = DBO+"country";
const DBR = "http://dbpedia.org/resource/";

const OLO = "http://purl.org/ontology/olo/core#";
const OLO_SLOT = OLO+"slot";
const OLO_INDEX = OLO+"index";
const OLO_ITEM = OLO+"item";

const DC = 'http://purl.org/dc/elements/1.1/';
const DC_DESCRIPTION = DC+'description';

const GEORSS_POINT = "http://www.georss.org/georss/point";

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
  await readRdfIntoStore('rdf-data/tours.ttl');
  //await readRdfIntoStore('rdf-data/recording_tracks.ttl');
}

export function getEventIds() {
  return getSubjects(RDF_TYPE, LMO_SHOW);
}

export function getTime(eventId: string): string {
  return getObject(getObject(eventId, EVENT_TIME), TL_AT_DATE);
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
  const name = toName(getLocationForEvent(eventId));
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

export function getVenueForEvent(eventId: string): string {
  return getObject(eventId, LMO_VENUE);
}

export function getVenueNameForEvent(eventId: string): string {
  return getObject(getObject(eventId, LMO_VENUE), LMO_VENUE_NAME) ;
}

export function getEventIdForRecording(recordingId: string): string {
  return getObject(recordingId, LMO_RECORDING_OF);
}

export function getRecordings(eventId: string): Recording[] {
  return getSubjects(LMO_RECORDING_OF, eventId).map(getRecording);
}

export function getRecording(recordingId: string): Recording {
  return {
    id: recordingId,
    etreeId: getObject(recordingId, LMO_ETREE_ID),              // NOT WORKING?
    isSoundboard: getObject(recordingId, LMO_REC_SOURCE) != null
  }
}

export function getEventId(recording: string): string {
  return getObject(recording, LMO_RECORDING_OF);
}

export function getArtefacts(eventId: string, lmoType?: string): Artifact[] {
  let ids: string[] = getObjects(getSubject(EVENT_SUBEVENT, eventId), LMO_ARTEFACT);
  if (lmoType) ids = ids.filter(a => getObject(a, RDF_TYPE) === lmoType);
  const images = ids.map(p => getSubject(LMO_DEPICTS, p));
  
  return ids.map((id,i) => ({
    type: LMO_TYPE_TO_ARTIFACT_TYPE[getObject(id, RDF_TYPE)],
    thumbnail: getObject(images[i], LMO_THUMBNAIL),
    image: getObject(images[i], LMO_IMAGE),
    description: getObject(getObject(id, LMO_DESCRIPTION), DC_DESCRIPTION),
    collection: getObject(id, LMO_GDAO_ID) ? "GDAO" : "Psilo",
    source: getObject(id, LMO_GDAO_ID) ? "https://www.gdao.org/items/show/" + getObject(id, LMO_GDAO_ID) : undefined
  }));
}

const LMO_TYPE_TO_ARTIFACT_TYPE = {
  [LMO_TICKET]: ArtifactType.Ticket,
  [LMO_POSTER]: ArtifactType.Poster,
  [LMO_PHOTO]: ArtifactType.Photo,
  [LMO_BACKSTAGEPASS]: ArtifactType.Pass,
  [LMO_ENVELOPE]: ArtifactType.Envelope,
  [LMO_TSHIRT]: ArtifactType.Tshirt,
  [LMO_FANART]: ArtifactType.Fanart
}

export function getSongEvents(songId: string): string[] {
  return store.getObjects(songId, LMO_PLAYED_AT);
}

export function getSongInfo(songId: string): SongInfo {
  return {
    id: songId,
    name: getObject(songId, LMO_SONG_NAME),
    composedBy: getObjects(songId, LMO_COMPOSED_BY).map(getArtist),
    lyricsBy: getObjects(songId, LMO_LYRICS_BY).map(getArtist)
  }
}

export function getSetlist(eventId: string): {name: string, songIds: string[]}[] {
  const sets = getOloList(getObject(eventId, LMO_SETLIST));
  return sets.map(s => ({
    name: getObject(s, LMO_SETNAME),
    songIds: getOloList(s)
  }))
}

export function getSongId(songname: string): string {
  return getSubjectForLiteral(LMO_SONG_NAME, songname);
}

export function getPerformers(eventId: string): Artist[] {
  const performanceIds: string[] =
    getObjects(getObject(eventId, LMO_LINEUP), LMO_PERFORMANCE);
  return performanceIds.map(getPerformer);
}

export function getArtistDetails(artistId: string): ArtistDetails {
  const compositions = getSubjects(LMO_COMPOSED_BY, artistId);
  const lyrics = getSubjects(LMO_LYRICS_BY, artistId);
  const performances = getSubjects(MO_PERFORMER, artistId);
  const eventIds = performances.map(p =>
    getSubject(LMO_LINEUP, getSubject(LMO_PERFORMANCE, p)));
  const instruments = _.uniq(_.union(...performances.map(getInstruments)));
  return Object.assign(getArtist(artistId), {
    eventIds: eventIds,
    compositions: compositions.concat(lyrics).map(getSongInfo),
    instruments: instruments
  });
}

function getPerformer(performanceId: string): Artist {
  return Object.assign(getArtist(getObject(performanceId, MO_PERFORMER)), {
    instruments: getInstruments(performanceId)
  });
}

function getInstruments(performanceId: string) {
  return getObjects(performanceId, MO_INSTRUMENT).map(toName);
}

function getArtist(artistId: string): Artist {
  return {
    id: artistId,
    name: getObject(artistId, FOAF_NAME),
    dbpediaId: getObject(artistId, LMO_DBPEDIA),
    musicbrainzId: getObject(artistId, MO_BRAINZ)
  }
}

export function getLabel(id: string): string {
  return getObject(id, RDFS_LABEL);
}

export function getVenueName(id: string): string {
  return getObject(id, LMO_VENUE_NAME);
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
  return subject && predicate ? getObjects(subject, predicate, 1)[0] : null;
}

function getObjects(subject: string, predicate: string, count?: number) {
  if (subject && predicate) {
    return store.getObjects(subject, predicate).slice(0, count).map(toLiteral);
  }
}

function toLiteral(object: string) {
  return N3.Util.isLiteral(object) ? N3.Util.getLiteralValue(object) : object;
}

function getSubjectForLiteral(predicate: string, object: string) {
  return getSubject(predicate, N3.Util.createLiteral(object));
}

function getSubject(predicate: string, object: string) {
  return getSubjects(predicate, object)[0];
}

function getSubjects(predicate: string, object: string): string[] { 
  //store.getSubjects doesnt seem to work :(
  return store.getTriples(null, predicate, object).map(t => t.subject);
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

function getOloList(uri: string) {
  const result = [];
  getObjects(uri, OLO_SLOT).forEach((o: string) =>
    result[getObject(o, OLO_INDEX)-1] = getObject(o, OLO_ITEM));
  return result;
}

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

export function toName(resource: string): string {
  if (resource) {
    if (resource.indexOf(DBR) >= 0) resource = resource.replace(DBR, '');
    if (resource.indexOf(MIT) >= 0) resource = resource.replace(MIT, '');
    if (resource.indexOf(LMO) >= 0) resource = resource.replace(LMO, '');
    return resource.replace(/_/g, ' ');
  }
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
  return triples[0].subject;
}

// unused, stored result in json instead
export function getVenueDetails(): VenueDetails[] {
  let venueDetailsList = [];
  getSubjects(RDF_TYPE, LMO_VENUE_CLASS).forEach((s: string) => {
    var shows = [];
    getVenueEvents(s).forEach((v: string) => {
      shows.push({ date: getTime(v), id: v.slice(_.lastIndexOf(v, '/')+1)});
    })        
    const c = getObject(s, GEORSS_POINT);
    var comment = getObject(s, RDFS_COMMENT);
    if (comment == 'georss:point for city only.'){
      comment = "city"; 
    } else {
      comment = "venue"
      }

    if (c != undefined) {
      var long = c.split(" ")[0];
      var lat = c.split(" ")[1];
      venueDetailsList.push({
        id: s.slice(_.lastIndexOf(s, '/')+1),
        name: getObject(s, RDFS_LABEL),
        long: long,
        lat: lat,
        shows: shows,
        georss: comment
      });
    }
  })
  //let data = JSON.stringify(venueDetailsList);
  //fs.writeFileSync('venue_details_list.json', data);

  return venueDetailsList;
}


export function getTourDetails(): any {
  var tourlist = {};
  var tours = getSubjects(RDF_TYPE, LMO_TOUR);
  tours.forEach(t => {
    var tour = {}
    var tour_name = getObject(t, LMO_TOUR_NAME);
    getObjects(t, LMO_TOUR_SHOW).forEach(s => {
      var t = getTime(s);
      var show_id = s.slice(_.lastIndexOf(s, '/')+1);
      var v = getObject(s, LMO_VENUE);
      var venue_name = getObject(v, RDFS_LABEL);
      const c = getObject(v, GEORSS_POINT);
      if (c != undefined) {
        var long = c.split(" ")[0];
        var lat = c.split(" ")[1];
        if (!(venue_name in tour)) {
          tour[venue_name] = {"long": long, "lat": lat, "id": v.slice(_.lastIndexOf(v, '/')+1), "shows": []};
        }
        var show = { "id": show_id, "date": t};
        tour[venue_name]["shows"].push(show);
      }
    })
    tourlist[tour_name] = tour; 
  })
  return tourlist;
}
