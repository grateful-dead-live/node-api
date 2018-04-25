let fetch = require('node-fetch');

function createObjectQuery(resource, predicate, language) {
  language = language ? 'FILTER (langMatches(lang(?object),"'+language+'"))' : "";
  let query = "SELECT ?object where { "+resource+" "+predicate+" ?object "+language+"}";
  return "http://dbpedia.org/sparql/?query="+encodeURIComponent(query)+"&format=json";
}

function getObjectFromDbpedia(resource, predicate, language) {
  if (resource.indexOf('<') < 0) {
    resource = '<'+resource+'>';
  }
  return fetch(createObjectQuery(resource, predicate, language))
    .then(r => r.text())
    .then(t => JSON.parse(t))
    .then(j => j.results.bindings[0].object.value)
    .catch(() => console.log("no "+predicate+" found for "+resource));
}

exports.getImage = function(resource) {;
  return getObjectFromDbpedia(resource, "foaf:depiction");
}

exports.getThumbnail = function(resource) {
  return getObjectFromDbpedia(resource, "dbo:thumbnail");
}

exports.getComment = function(resource) {
  return getObjectFromDbpedia(resource, "rdfs:comment", "en");
}

exports.getGeolocation = function(resource) {
  return getObjectFromDbpedia(resource, "geo:geometry")
    .then(g => {
      if (g) {
        g = g.split(" ");
        return {
          long: parseFloat(g[0].slice(6)),
          lat: parseFloat(g[1].slice(0, g.indexOf(')')))
        }
      }
    });
}

//"http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=select+*+%7B%0D%0A++++++%3Fperson+a+dbo%3APerson%0D%0A++++%7D&format=text%2Fhtml&CXML_redir_for_subjs=121&CXML_redir_for_hrefs=&timeout=30000&debug=on"