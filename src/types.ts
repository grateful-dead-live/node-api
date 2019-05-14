export interface DeadEvent {
  id: string,
  date: string,
  location: string
}

export interface DeadEventInfo {
  date: string,
  location: Location,
  venue: any,
  setlist: any,
  weather: any,
  recordings: any,
  performers: any,
  artifacts: Artifact[]
}

export interface Venue {
  id: string,
  name: string,
  events: DeadEvent[],
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
  name: string,
  events: DeadEvent[],
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