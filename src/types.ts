export interface DeadEventInfo {
  id: string,
  date: string,
  location: string,
  state: string,
  venue: string,
  ticket: string,
  pass: string,
  poster: string,
  photo: string,
  recordings: string[]
}

export interface DeadEventDetails {
  id: string,
  date: string,
  location: Location,
  venue: Venue,
  setlist: Set[],
  weather: any,
  recordings: string[],
  performers: any,
  artifacts: Artifact[]
}

export interface Artifact {
  type: string,
  image: string
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

export interface AudioTrack {
  filename: string,
  format: string,
  title: string,
  track: string
}

export interface GdEventsObject extends GdObject {
  eventIds: string[]
}

export interface Performer extends Artist {
  instruments: string[]
}

export interface Artist extends GdObject {
  musicbrainzId: string,
  dbpediaId?: string
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

export interface EtreeInfo {
  tracks: string[]
}