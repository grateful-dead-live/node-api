import * as _ from 'lodash';
import * as fs from 'fs';
import * as store from './store';
import * as dbpedia from './dbpedia';
import * as news from './news';
import * as etree from './etree';
import { DeadEventInfo, DeadEventDetails, Venue, Location, DbpediaObject,
  SongInfo, SongDetails, Artist, ArtistDetails, Set, Recording, RecordingDetails,
  AudioTrack, 
  RecordingInfo} from './types';
//import { setMaxListeners } from 'cluster';
import * as archive from './archive';

interface SongMap {
  [songName: string]: {
    [recordingId: string]: AudioTrack[]
  }
}

/*interface RecMap {
  [recordingId: string]: AudioTrack[]
}*/

const LMO_PREFIX = 'https://w3id.org/lmo/resource/';
const DBP_PREFIX = 'http://dbpedia.org/resource/';
const SONGMAP: SongMap = JSON.parse(fs.readFileSync('json-data/app_song_map.json', 'utf8'));
//const RECORDINGDICT = JSON.parse(fs.readFileSync('json-data/recording_dict.json', 'utf8'));
//const SONGDICT = JSON.parse(fs.readFileSync('json-data/song_dict.json', 'utf8'));
//const VENUEDETAILS = JSON.parse(fs.readFileSync('json-data/venue_details_list.json', 'utf8'));
 

/*const tracksByRecording: [string, AudioTrack[]][] =
  _.flatten(_.values(SONGMAP).map(_.toPairs));
const grouped = _.groupBy(tracksByRecording, p => p[0]);
//tracks are not ordered! refer to etree for order...
const RECMAP: RecMap = _.mapValues(grouped, v => _.flatten(v.map(ps => ps[1])));*/

export function getAllEventInfos(): DeadEventInfo[] {
  return store.getEventIds().map(getEventInfo);
}

export function getAllCoordinates() {
  //return VENUEDETAILS;
  return store.getVenueDetails();
}

export function getTours() {
  return store.getTourDetails();
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
    recordings: makeIdsShort(store.getRecordings(eventId))
  };
}

export async function getEventDetails(eventId: string): Promise<DeadEventDetails> {
  eventId = toLmoId(eventId);
  const date = store.getTime(eventId);
  if (!date){ 
    return <DeadEventDetails>{};
  }
  const [loc, ven, per, nw1, nw2] = await Promise.all([
    getLocation(store.getLocationForEvent(eventId)),
    getVenue(store.getVenueForEvent(eventId)),
    getPerformers(eventId),
    news.getNewsFromNytimes(date),
    news.getNewsFromGuardian(date)
  ]);
  const artifacts = store.getArtefacts(eventId);
  const recs = makeIdsShort(store.getRecordings(eventId));
  return {
    id: toShortId(eventId),
    date: date,
    location: <Location> loc,
    venue: ven,
    setlist: getSetlist(eventId),
    weather: store.getWeather(eventId),
    news: _.sortBy(nw1.concat(nw2), n => n.date),
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
    //const label = store.getLabel(venueId);
    const venueName = store.getVenueName(venueId);
    return Object.assign({
      id: toShortId(venueId),
      //name: label ? label : store.toName(venueId),
      name: venueName ? venueName : store.toName(venueId),
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
  //console.log(songId)
  if (info) {
    return Object.assign(info, {
      audio: SONGMAP[info.name.toLowerCase()],
      eventIds: store.getSongEvents(toLmoId(songId)).map(toShortId),
      id: songId
    });
  }
}

function getSongInfo(songId: string): SongInfo {
  return makeIdShort(store.getSongInfo(toLmoId(songId)));
}

export function getDiachronicSongDetails(songname: string, count = 10, skip = 0): SongDetails {
  const songId = store.getSongId(songname);
  //console.log(songname, songId);
  const songDetails = getSongDetails(songId);
  const events = songDetails.eventIds.map(getEventInfo);
  events.sort((a, b) => parseFloat(a.date.replace(/-/g, ''))
    - parseFloat(b.date.replace(/-/g, '')));
  let selectedEvents: [string, Recording][] = <[string, Recording][]>events.map(e =>
    [e.id, store.getRecordings(toLmoId(e.id)).filter(r => r.isSoundboard)[0]]);
  selectedEvents = selectedEvents.filter(([_,r]) => r != null)
    .filter((_,i) => i % (skip+1) == 0).slice(0, count);
  const soundboardIds = selectedEvents.map(([_,r]) => r.etreeId);
  songDetails.audio = _.pick(songDetails.audio, soundboardIds);
  songDetails.eventIds = selectedEvents.map(([e,_]) => toShortId(e));
  return songDetails;
}

export async function getRecordingDetails(recordingId: string): Promise<RecordingDetails> {
  console.log('etree: getRecordingDetails');
  const recording = makeIdShort(store.getRecording(toLmoId(recordingId)))
  return Object.assign(recording, {
    info: await etree.getInfoFromEtree(recording.etreeId),
    tracks: getTracksForRecording(recordingId)
  });
}

export function getTracksForRecording(recordingId: string): AudioTrack[] {
  //console.log('getTracksForRecording')
  var recordingId = toLmoId(recordingId);
  //etree info seems unreliable for tracks!! but anyway it's sooo slow...
  //const tracks = etreeInfo.tracks.map(n => getTrackFromRecMap(etreeId, n));
  const etreeId = store.getRecording(recordingId).etreeId;  // TODO: include name
  const eventId = store.getEventIdForRecording(recordingId);
  const setlist = getSetlist(eventId);
  //setlist.forEach( i => i.songs.forEach( s => console.log(s)))
  //const songs = _.flatten(setlist.map(l => l.songs.map(s => getSongDetails(s.id))));
  //sometimes audio for recording not there!!
  //sometimes multiple song ids for track
  //console.log( _.flatten(songs.map(s => s.audio[etreeId]).filter(s => s)));
  //return _.flatten(songs.map(s => s.audio[etreeId]).filter(s => s));
  var ttracks =  _.flatten(setlist.map(l => l.songs.map(s => SONGMAP[s.name.toLowerCase()][etreeId] ? getAudioInfo(s, etreeId): undefined)));
  var tracks = _.flatten(ttracks).filter(function (el) {
    return el != null;
  });

  //etree.getInfoFromEtree(etreeId).then( r => console.log(r));
  //console.log(tracks)
  return tracks
  
}

/*function getTrackFromRecMap(etreeId: string, filename: string): AudioTrack {
  return RECMAP[etreeId].filter(t => t.filename === filename)[0]
}*/

function getAudioInfo(s, etreeId){
  var a = SONGMAP[s.name.toLowerCase()][etreeId];
  a[0]['id'] = s.id;
  return a;
}

async function getPerformers(eventId: string): Promise<Artist[]> {
  return Promise.all(store.getPerformers(eventId).map(addDbpediaInfo));
}

export async function getArtistDetails(performerId: string): Promise<ArtistDetails> {
  const artistDetails = store.getArtistDetails(toLmoId(performerId));
  artistDetails.eventIds = artistDetails.eventIds.map(toShortId);
  artistDetails.compositions.forEach(c => {
    makeIdsShort(c.composedBy);
    makeIdsShort(c.lyricsBy);
  });
  return <Promise<ArtistDetails>>addDbpediaInfo(artistDetails);
}

async function addDbpediaInfo(artist: (Artist | ArtistDetails)) {
  return makeIdShort(Object.assign(artist, await getDbpediaInfo(artist.dbpediaId)));
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

function makeIdsShort<T extends {id: string}>(objects: T[]) {
  return objects.map(makeIdShort);
}

function makeIdShort<T extends {id: string}>(object: T) {
  object.id = toShortId(object.id);
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



export async function getRecordingInfo(recordingId: string, etreeId: string): Promise<RecordingInfo> {
  var info = await archive.getArchiveinfo(etreeId);
  info['date'] = info['date'].split('T')[0];
  info['etree_id'] = etreeId;
  info['show_id'] = toShortId(store.getEventIdForRecording(toLmoId(recordingId)));
  info['venue_id'] = toShortId(store.getVenueForEvent(toLmoId(info['show_id'])));
  info['venue_name'] = toShortId(store.getVenueNameForEvent(toLmoId(info['show_id'])));
  info['location_id'] = toShortId(store.getLocationForEvent(toLmoId(info['show_id'])));
  const state = toShortId(store.getStateOrCountry(toDbpediaId(info['location_id'])));
  const city =  toShortId(store.getLocationNameForEvent(toLmoId(info['show_id'])));
  info['location_name'] = city + ', ' + state;
  info['recording_id'] = recordingId;
  return info;
}
