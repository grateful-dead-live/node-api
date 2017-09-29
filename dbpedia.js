let fetch = require('node-fetch');

function createImageQuery(resource) {
  return `
    SELECT ?image where {
      `+resource+` dbo:thumbnail ?image .
    }`
}

exports.getImage = function(resource) {
  return fetch("http://dbpedia.org/sparql?query="+encodeURIComponent(createImageQuery(resource))+"&format=json")
    .then(r => r.text())
    .then(t => JSON.parse(t))
    .then(j => j.results.bindings[0].image.value);
}

//"http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=select+*+%7B%0D%0A++++++%3Fperson+a+dbo%3APerson%0D%0A++++%7D&format=text%2Fhtml&CXML_redir_for_subjs=121&CXML_redir_for_hrefs=&timeout=30000&debug=on"