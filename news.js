const NYTAPIKEY = "";
const request = require('request');

  exports.getObjectFromNytimes = function(date) {
    return new Promise((resolve, reject) => {
      request.get({
        url: "https://api.nytimes.com/svc/search/v2/articlesearch.json",
        qs: {
          'api-key': NYTAPIKEY,
          'begin_date': date,
          'end_date': date
        },
      }, function(err, response, body) {
        if (err) reject(err);
        docs = JSON.parse(body).response.docs;
        //console.log(JSON.stringify(body));
        resolve(docs);
      });
    })
  }