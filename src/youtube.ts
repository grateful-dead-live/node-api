import * as userDb from './userdb';
import * as fetch from 'node-fetch';
import { YOUTUBEAPIKEY } from './config'


export async function getYouTubeList(id, searchArray) {
    var timestamp = new Date;
    var y = await userDb.getYoutubeList(id);
    if (!y || timestamp.getTime() - y.timestamp > 604800000) {
        //var res = await fetchYoutubeVideos(searchArray);
        var res = [1,2,3];
        if (res) userDb.addYoutubelist(id, res, timestamp.getTime());
        else res = y;
    }
    else res = y;
    console.log(res)
    return res  
}


async function fetchYoutubeVideos(searchArray): Promise<any>{
    searchArray = JSON.parse(searchArray);
    var searchString = '';
    searchArray.forEach(s => searchString += '"'+s+'"' + '+');
    searchString = searchString.slice(0, -1);
    console.log(searchString);
    var r = await getPage(searchString);
    console.log(r)
    if (!r.items) result = null;
    else { 
        var result = r.items;
        r = await getPage(searchString, r.nextPageToken);
        r.items.forEach(i => result.push(i));
        console.log(result);
    }
    return result;
  }



async function getPage(searchString, nextPageToken?): Promise<any> {
    const maxResults = 10;
    var pageToken;
    nextPageToken ? pageToken = nextPageToken : pageToken = '';
    let url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&order=relevance&q=' + searchString + '&type=video&key=' 
              + YOUTUBEAPIKEY + ' &pageToken=' + pageToken + '&maxresults=' + maxResults;
    return fetch(url)
      .then(r => r.text())
      .then(t => JSON.parse(t))
      .catch(e => console.log(e));
}
