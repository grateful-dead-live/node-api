const NYTAPIKEY = "";
const GUARDIANAPIKEY = "";
const request = require('request');

  exports.getObjectFromNytimes = function(date) {
    return new Promise((resolve, reject) => {
      const daysprior = 7;
      var date1 = new Date(date);
      date1.setDate(date1.getDate() - daysprior);
      date1 = date1.toISOString().substring(0, 10);
      //console.log(date1);
      request.get({
        url: "https://api.nytimes.com/svc/search/v2/articlesearch.json",
        qs: {
          'api-key': NYTAPIKEY,
          'begin_date': date1.replace(/-/g, ''),
          'end_date': date.replace(/-/g, ''),
          'fq': 'type_of_material:("News")'
        },
      }, function(err, response, body) {
        if (err) reject(err);
        docs = JSON.parse(body).response.docs;
        //console.log(JSON.stringify(body));
        resolve(docs);
      });
    })
  }

  exports.getObjectFromGuardian = function(date) {
    return new Promise((resolve, reject) => {
      const daysprior = 7;
      var date1 = new Date(date);
      date1.setDate(date1.getDate() - daysprior);
      date1 = date1.toISOString().substring(0, 10);
      console.log(date);
      console.log(date1);
      request.get({
        url: "https://content.guardianapis.com/search",
        qs: {
          'api-key': GUARDIANAPIKEY,
          'from-date': date1,
          'to-date': date
        },
      }, function(err, response, body) {
        //console.log(body);
        if (err) reject(err);
        docs = JSON.parse(body).response.results;
        resolve(docs);
      });
    })
  }