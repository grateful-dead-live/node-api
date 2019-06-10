export interface DeadEventInfo {
  id: string,
  date: string,
  location: string,
  state: string,
  venue: string,
  tickets: string[],
  recordings: string[]
}

export interface DeadEventDetails {
  id: string,
  date: string,
  location: Location,
  venue: Venue,
  setlist: SongInfo[],
  weather: any,
  recordings: string[],
  performers: any,
  artifacts: Artifact[]
}

interface Artifact {
  type: string,
  image: string
}

export type Venue = GdObject;

export interface Location extends GdObject {
  state: string
}

export type SongInfo = GdObject;

export interface SongWithAudio extends GdObject {
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

export interface GdObject extends DbpediaObject {
  id: string,
  name: string,
  eventIds: string[]
}

export interface DbpediaObject {
  image?: string,
  thumbnail?: string,
  comment?: string,
  geoloc?: Geolocation
}

export interface Performer {
  name: string,
  instrument: string,
  sameAs: string
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