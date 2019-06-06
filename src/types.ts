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
  setlist: Song[],
  weather: any,
  recordings: string[],
  performers: any,
  artifacts: Artifact[]
}

export interface Song {
  id: string,
  name: string,
  events: DeadEventInfo[],
  audio?: Audio[]
}

export interface Audio {
  date: string,
  filename: string,
  format: string,
  recording: string,
  track: string
}

export interface Venue {
  id: string,
  name: string,
  events: DeadEventInfo[],
  image?: string,
  thumbnail?: string,
  comment?: string,
  geoloc?: Geolocation
}

interface Artifact {
  type: string,
  image: string
}

export interface Location {
  id: string,
  name: string,
  state: string,
  events: DeadEventInfo[],
  image?: string,
  thumbnail?: string,
  comment?: string,
  geoloc?: Geolocation
}

export interface Geolocation {
  lat: number,
  long: number
}

export interface EtreeInfo {
  tracks: string[]
}