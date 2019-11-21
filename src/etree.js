let fetch = require('node-fetch');

function createInfoQuery(resource) {
  let query = "PREFIX etree: <http://etree.linkedmusic.org/vocab/> SELECT ?notes ?source ?lineage { <http://etree.linkedmusic.org/performance/" + resource + ">"
  + " etree:notes ?notes ; "
  + "etree:source ?source ; "
  + "etree:lineage ?lineage . } "; 
 //console.log(query);
  return "http://etree.linkedmusic.org/sparql?default-graph-uri=&query="+encodeURIComponent(query)+"&format=json";
}

function createKeywordQuery(resource){
  let query = "PREFIX etree: <http://etree.linkedmusic.org/vocab/> SELECT ?keyword { <http://etree.linkedmusic.org/performance/" + resource + ">"
+ " etree:keyword ?keyword . } "; 
//console.log(query);
return "http://etree.linkedmusic.org/sparql?default-graph-uri=&query="+encodeURIComponent(query)+"&format=json";

}

exports.getInfoFromEtree = function(resource) {
  //console.log(resource);

  //console.log(createTracksQuery(resource));

  return fetch(createInfoQuery(resource))
  .then(r => r.text())
  .then(t => JSON.parse(t))
  .then(j => j.results.bindings[0])
  .then(async b => ({
    id: resource,
    notes: b["notes"]["value"],
    source: b["source"]["value"],
    lineage: b["lineage"]["value"],
    keywords: await getKeywordFromEtree(resource),
    tracks: await getTracksFromEtree(resource)
    }))
  .catch(() => { 
    console.log("etree linked data not found");
    return {
      id: resource,
      notes: "n/a",
      source: "n/a",
      lineage: "n/a",
      keywords: "n/a",
      tracks: "n/a"
      }
  })
}

function getKeywordFromEtree(resource) {
  //console.log("KEYWORDS:")
  return fetch(createKeywordQuery(resource))
  .then(r => r.text())
  .then(t => JSON.parse(t))
  .then(j => { 
    let res = getString(j.results.bindings);
    //console.log(res);
    return res
  })
}

function getString(res) {
  let elements = [];
  for (var i in res) {
    elements.push(res[i]["keyword"]["value"])
  }
  elements = elements.join(', ');
  //console.log(elements);
  return elements;
}


function createTracksQuery(resource){
  let query = "PREFIX etree: <http://etree.linkedmusic.org/vocab/> PREFIX event: <http://purl.org/NET/c4dm/event.owl#> SELECT ?audio { <http://etree.linkedmusic.org/performance/" + resource + "> event:hasSubEvent [ etree:audio ?audio ] . FILTER (!regex(str(?audio), '.mp3'))  FILTER (!regex(str(?audio), '.ogg'))  }"; 
  return "http://etree.linkedmusic.org/sparql?default-graph-uri=&query="+encodeURIComponent(query)+"&format=json";
}


async function getTrackList(resource, res){
  
  let elements = [];
  for (var i in res){
    let r = res[i].audio.value;
    r = r.split("/");
    r = r[r.length - 1];
    r = r.split(".");
    r = r.slice(0, r.length - 1).join(".");
    elements.push(r);
  }

  //if (!(await spectrogramExists(resource, elements[0]))) {
  //  return "n/a"
  //}

  return elements.sort()

}

function getTracksFromEtree(resource) {
  //console.log("TRACKS:")
  return fetch(createTracksQuery(resource))
  .then(r => r.text())
  .then(t => JSON.parse(t))
  .then(j => j.results.bindings)
  .then(r => {
    let res = getTrackList(resource, r);
    return res
  })
}

function spectrogramExists(resource, track){
  let image_url = 'https://archive.org/download/' + resource + '/' + track + '_spectrogram.png'
  //console.log(image_url)

  return fetch(image_url)
  .then(r => r.status != 404)

}