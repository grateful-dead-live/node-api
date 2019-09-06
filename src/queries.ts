import * as _ from 'lodash';
import * as fs from 'fs';
import * as store from './store';
import * as dbpedia from './dbpedia';
import * as news from './news';
import { DeadEventInfo, DeadEventDetails, Venue, Location, DbpediaObject,
  SongInfo, SongDetails, Artist, ArtistDetails, Set, Recording } from './types';

const LMO_PREFIX = 'https://w3id.org/lmo/resource/';
const DBP_PREFIX = 'http://dbpedia.org/resource/';
const SONGMAP = JSON.parse(fs.readFileSync('json-data/app_song_map.json', 'utf8'));

export function getAllEventInfos(): DeadEventInfo[] {
  return store.getEventIds().map(getEventInfo);
}

export function getAllCoordinates() {
  return store.getVenueDetails();
}


function getEventInfo(eventId: string): DeadEventInfo {
  eventId = toLmoId(eventId);
  return {
    id: toShortId(eventId),
    date: store.getTime(eventId),
    location: store.getLocationNameForEvent(eventId),
    state: store.toName(store.getStateOrCountry(store.getLocationForEvent(eventId))),
    venue: store.getVenueNameForEvent(eventId),
    artifacts: store.getArtefacts(eventId),
    recordings: store.getRecordings(eventId)
  };
}

export async function getEventDetails(eventId: string): Promise<DeadEventDetails> {
  eventId = toLmoId(eventId);
  const date = store.getTime(eventId);
  const [loc, ven, per, nw1, nw2] = await Promise.all([
    getLocation(store.getLocationForEvent(eventId)),
    getVenue(store.getVenueForEvent(eventId)),
    getPerformers(eventId),
    news.getNewsFromNytimes(date),
    news.getNewsFromGuardian(date)
  ]);
  const artifacts = store.getArtefacts(eventId);
  const recs = store.getRecordings(eventId);
  /*const recInfos: EtreeInfo[] = await Promise.all(
    store.getRecordings(eventId).map(r => etree.getInfoFromEtree(r.etreeId)));
  const recDetails: RecordingDetails[] =
    _.zipWith(recs, recInfos, (r, i) => Object.assign(r, {info: i}));*/
  return {
    id: toShortId(eventId),
    date: date,
    location: loc,
    venue: ven,
    setlist: getSetlist(eventId),
    weather: store.getWeather(eventId),
    news: nw1.concat(nw2),
    recordings: recs,
    performers: per,
    artifacts: artifacts
  };
}

export async function getVenue(venueId: string): Promise<Venue> {
  venueId = toLmoId(venueId);
  const LMO_DBPEDIA = "https://w3id.org/lmo/vocabulary/dbpedia";
  if (venueId) {
    const venueDbpedia = store.getObject(venueId, LMO_DBPEDIA);
    const label = store.getLabel(venueId);
    return Object.assign({
      id: toShortId(venueId),
      name: label ? label : store.toName(venueId),
      eventIds: store.getVenueEvents(venueId).map(toShortId),
    }, await getDbpediaInfo(venueDbpedia, true));
  }
}

export async function getLocation(locationId: string): Promise<Location> {
  locationId = toDbpediaId(locationId);
  if (locationId) {
    return Object.assign({
      id: toShortId(locationId),
      name: store.toName(locationId).split(',')[0],
      state: store.toName(store.getStateOrCountry(locationId)),
      eventIds: store.getLocationEvents(locationId).map(toShortId)
    }, await getDbpediaInfo(locationId, true));
  }
}

export function getSetlist(eventId: string): Set[] {
  const sets = store.getSetlist(toLmoId(eventId))
  return sets.map(s => ({
    name: s.name,
    songs: s.songIds.map(getSongInfo)
  }));
}

export function getSongDetails(songId: string): SongDetails {
  const info = getSongInfo(songId);
  if (info) {
    return Object.assign(info, {
      audio: SONGMAP[info.name.toLowerCase()],
      eventIds: store.getSongEvents(toLmoId(songId)).map(toShortId)
    });
  }
}

function getSongInfo(songId: string): SongInfo {
  const songInfo = store.getSongInfo(toLmoId(songId));
  songInfo.id = toShortId(songInfo.id);
  return songInfo;
}

export function getDiachronicSongDetails(songname: string, count = 10, skip = 0): SongDetails {
  const songId = store.getSongId(songname);
  console.log(songname, songId);
  const songDetails = getSongDetails(songId);
  const events = songDetails.eventIds.map(getEventInfo);
  events.sort((a, b) => parseFloat(a.date.replace(/-/g, ''))
    - parseFloat(b.date.replace(/-/g, '')));
  let selectedEvents: [string, Recording][] = events.map(e =>
    [e.id, store.getRecordings(toLmoId(e.id)).filter(r => r.isSoundboard)[0]]);
  selectedEvents = selectedEvents.filter(([_,r]) => r != null)
    .filter((_,i) => i % (skip+1) == 0).slice(0, count);
  const soundboardIds = selectedEvents.map(([_,r]) => r.etreeId);
  songDetails.audio = _.pick(songDetails.audio, soundboardIds);
  songDetails.eventIds = selectedEvents.map(([e,_]) => toShortId(e));
  return songDetails;
}

async function getPerformers(eventId: string): Promise<Artist[]> {
  return Promise.all(store.getPerformers(eventId).map(addDbpediaInfo));
}

export async function getArtistDetails(performerId: string): Promise<ArtistDetails> {
  const artistDetails = store.getArtistDetails(toLmoId(performerId));
  artistDetails.eventIds = artistDetails.eventIds.map(toShortId);
  artistDetails.compositions.forEach(c => {
    c.composedBy.forEach(a => a.id = toShortId(a.id));
    c.lyricsBy.forEach(a => a.id = toShortId(a.id));
  });
  return <Promise<ArtistDetails>>addDbpediaInfo(artistDetails);
}

async function addDbpediaInfo(artist: (Artist | ArtistDetails)) {
  artist = Object.assign(artist, await getDbpediaInfo(artist.dbpediaId));
  artist.id = toShortId(artist.id);
  return artist;
}


async function getDbpediaInfo(id: string, includeGeoloc?: boolean): Promise<DbpediaObject> {
  const info = await Promise.all([
    dbpedia.getImage(id),
    dbpedia.getThumbnail(id),
    dbpedia.getComment(id),
    includeGeoloc ? dbpedia.getGeolocation(id) : undefined
  ]);
  const object: DbpediaObject =
    { image: info[0], thumbnail: info[1], comment: info[2] };
  if (includeGeoloc) object.geoloc = info[3];
  return object;
}

function toShortId(id: string) {
  return id.slice(_.lastIndexOf(id, '/')+1);
}

function toLmoId(id: string) {
  return id.indexOf(LMO_PREFIX) < 0 ? LMO_PREFIX+id : id;
}

function toDbpediaId(id: string) {
  return id.indexOf(DBP_PREFIX) < 0 ? DBP_PREFIX+id : id;
}