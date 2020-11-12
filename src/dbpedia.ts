import * as fetch from 'node-fetch';
import { logger } from './logger';

const BUFFER = new Map<string, Map<string, string>>();

export async function getImage(resource: string) {
  return getObjectFromDbpedia(resource, "foaf:depiction");
}

export async function getThumbnail(resource: string) {
  return getObjectFromDbpedia(resource, "dbo:thumbnail");
}

export async function getComment(resource: string) {
  return getObjectFromDbpedia(resource, "rdfs:comment", "en");
}

export async function getGeolocation(resource: string) {
  return getObjectFromDbpedia(resource, "geo:geometry")
    .then(g => {
      if (g) {
        const split = g.split(" ");
        return {
          long: parseFloat(split[0].slice(6)),
          lat: parseFloat(split[1].slice(0, g.indexOf(')')))
        }
      }
    });
}

async function getObjectFromDbpedia(resource: string, predicate: string, language?: string) {
  if (resource) {
    if (resource.indexOf('<') < 0) {
      resource = '<'+resource+'>';
    }
    let result = getBuffered(resource, predicate);
    if (result) return result;
    return fetch(createObjectQuery(resource, predicate, language))
      .then(r => r.text())
      .then(t => JSON.parse(t))
      .then(j => j.results.bindings[0].object.value)
      .then(j => setBuffered(resource, predicate, j))
      .catch(() => logger("no "+predicate+" found for "+resource));
  }
}

function getBuffered(resource: string, predicate: string) {
  if (BUFFER.has(resource)) {
    return BUFFER.get(resource).get(predicate);
  }
}

function setBuffered(resource: string, predicate: string, value: string) {
  if (!BUFFER.has(resource)) {
    BUFFER.set(resource, new Map<string, string>());
  }
  BUFFER.get(resource).set(predicate, value);
  return value;
}

function createObjectQuery(resource: string, predicate: string, language?: string) {
  language = language ? 'FILTER (langMatches(lang(?object),"'+language+'"))' : "";
  const query = "SELECT ?object where { "+resource+" "+predicate+" ?object "+language+"}";
  return "http://dbpedia.org/sparql/?query="+encodeURIComponent(query)+"&format=json";
}

//"http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=select+*+%7B%0D%0A++++++%3Fperson+a+dbo%3APerson%0D%0A++++%7D&format=text%2Fhtml&CXML_redir_for_subjs=121&CXML_redir_for_hrefs=&timeout=30000&debug=on"