export interface DeadEventInfo {
  id: string,
  date: string,
  location: string,
  state: string,
  venue: string,
  recordings: Recording[],
  artifacts: Artifact[]
}

export interface DeadEventDetails {
  id: string,
  date: string,
  location: Location,
  venue: Venue,
  setlist: Set[],
  weather: Weather,
  news: News[],
  recordings: Recording[],
  performers: Artist[],
  artifacts: Artifact[]
}

export enum ArtifactType {
  Ticket = 'ticket',
  Poster = 'poster',
  Pass = 'backstage pass',
  Photo = 'photo',
  Envelope = 'envelope',
  Tshirt = 'T-shirt',
  Fanart = 'fan art'
}

export interface Artifact {
  type: ArtifactType,
  thumbnail: string,
  image: string,
  description: string,
  collection: string,
  source: string
}

export type Venue = GdEventsObject;

export interface Location extends GdEventsObject {
  state: string
}

export interface Set {
  name: string,
  songs: SongInfo[]
}

export interface SongInfo extends GdObject {
  composedBy: Artist[],
  lyricsBy: Artist[]
};

export interface SongDetails extends SongInfo, GdEventsObject {
  audio?: AudioTrackMap
}

export interface AudioTrackMap {
  [recordingId: string]: AudioTrack[]
}

export interface RecordingDetails extends Recording {
  info: EtreeInfo
  tracks: AudioTrack[]
}

export interface Recording {
  id: string,
  etreeId: string,
  isSoundboard: boolean
}

export interface AudioTrack {
  filename: string,
  format: string,
  title: string,
  track: string,
  id: string
}

export interface ArtistDetails extends Artist, GdEventsObject {
  compositions: SongInfo[]
}

export interface Artist extends GdObject {
  musicbrainzId: string,
  dbpediaId?: string,
  instruments?: string[]
}

export interface GdEventsObject extends GdObject {
  eventIds: string[]
}

export interface GdObject extends DbpediaObject {
  id: string,
  name: string
}

export interface DbpediaObject {
  image?: string,
  thumbnail?: string,
  comment?: string,
  geoloc?: Geolocation
}

export interface Geolocation {
  lat: number,
  long: number
}

export interface Weather {
  maxTemperature: number,
  minTemperature: number,
  precipitation: string,
  wind: number,
  windDirection: string,
  windDirectionIcon: string,
  condition: string,
  conditionIcon: string
}

export interface News {
  source: string,
  title: string,
  date: string,
  url: string
}

export interface EtreeInfo {
  tracks: string[],
  id: string,
  notes: string,
  source: string,
  lineage: string,
  keywords: string[],
}

export interface VenueDetails {
  name: string,
  id: string,
  long: number,
  lat: number,
  shows: [],
  georss: string
}