import * as _ from 'lodash';
import * as fs from 'fs';
import * as store from './store';
import * as dbpedia from './dbpedia';
import * as news from './news';
import { DeadEventInfo, DeadEventDetails, Venue, Location, DbpediaObject,
  SongInfo, SongWithAudio, Performer } from './types';

const LMO_PREFIX = 'https://w3id.org/lmo/resource/';
const DBP_PREFIX = 'http://dbpedia.org/resource/';
const SONGMAP = JSON.parse(fs.readFileSync('json-data/app_song_map.json', 'utf8'));

export function getAllEventInfos(): DeadEventInfo[] {
  return store.getEventIds().map(getEventInfo);
}

function getEventInfo(eventId: string): DeadEventInfo {
  eventId = toLmoId(eventId);
  return {
    id: toShortId(eventId),
    date: store.getTime(eventId),
    location: store.getLocationNameForEvent(eventId),
    state: store.dbpediaToName(store.getStateOrCountry(store.getLocationForEvent(eventId))),
    venue: store.getVenueNameForEvent(eventId),
    tickets: store.getTickets(eventId),
    recordings: store.getRecordings(eventId)
  };
}

export async function getEventDetails(eventId: string): Promise<DeadEventDetails> {
  eventId = toLmoId(eventId);
  const [loc, ven, per] = await Promise.all([
    getLocation(store.getLocationForEvent(eventId)),
    getVenue(store.getVenueForEvent(eventId)),
    getPerformers(eventId)
  ]);
  const artifacts = [];
  store.getTickets(eventId).forEach(t => artifacts.push({type: 'ticket', image: t}));
  store.getPosters(eventId).forEach(p => artifacts.push({type: 'poster', image: p}));
  store.getPasses(eventId).forEach(p => artifacts.push({type: 'pass', image: p}));
  store.getEnvelopes(eventId).forEach(p => artifacts.push({type: 'envelope', image: p}));
  store.getPhotos(eventId).forEach(p => artifacts.push({type: 'photo', image: p}));
  return {
    id: toShortId(eventId),
    date: store.getTime(eventId),
    location: loc,
    venue: ven,
    setlist: getSetlist(eventId),
    weather: store.getWeather(eventId),
    recordings: store.getRecordings(eventId),
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
      name: label ? label : store.dbpediaToName(venueId),
      eventIds: store.getVenueEvents(venueId)
    }, await getDbpediaInfo(venueDbpedia));
  }
}

export async function getLocation(locationId: string): Promise<Location> {
  locationId = toDbpediaId(locationId);
  if (locationId) {
    return Object.assign({
      id: toShortId(locationId),
      name: store.dbpediaToName(locationId).split(',')[0],
      state: store.dbpediaToName(store.getStateOrCountry(locationId)),
      eventIds: store.getLocationEvents(locationId)
    }, await getDbpediaInfo(locationId));
  }
}

export function getSetlist(eventId: string): SongInfo[] {
  eventId = toLmoId(eventId);
  return store.getSetlist(eventId).map(getSongInfo);
}

export function getSongWithAudio(songId: string): SongWithAudio {
  const info = getSongInfo(songId);
  return Object.assign(info, {audio: SONGMAP[info.name.toLowerCase()]});
}

function getSongInfo(songId: string): SongInfo {
  songId = toLmoId(songId);
  return {
    id: toShortId(songId),
    name: store.getSongLabel(songId),
    eventIds: store.getSongEvents(songId)
  }
}

async function getPerformers(eventId: string): Promise<Performer[]> {
  const performers = store.getPerformers(eventId);
  return Promise.all(performers.map(async p => {
    const imgs = await Promise.all([
      dbpedia.getImage(p.sameAs), dbpedia.getThumbnail(p.sameAs)]);
    p["image"] = imgs[0];
    p["thumbnail"] = imgs[1];
    return p
  }));
}

function getNews(eventId: string) {
  return news.getObjectFromNytimes(store.getTime(eventId));
}

function getNews2(eventId: string) {
  return news.getObjectFromGuardian(store.getTime(eventId));
}


async function getDbpediaInfo(id: string): Promise<DbpediaObject> {
  const info = await Promise.all([
    dbpedia.getImage(id),
    dbpedia.getThumbnail(id),
    dbpedia.getComment(id),
    dbpedia.getGeolocation(id)
  ]);
  return {
    image: info[0],
    thumbnail: info[1],
    comment: info[2],
    geoloc: info[3]
  }
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