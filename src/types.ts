export interface DeadEventInfo {
  id: string,
  date: string,
  locationName: string,
  state: string,
  venueName: string,
  tickets: string[]
}

export interface DeadEventDetails {
  id: string,
  date: string,
  location: Location,
  venue: Venue,
  setlist: any,
  weather: any,
  recordings: any,
  performers: any,
  artifacts: Artifact[]
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