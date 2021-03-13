import * as userDb from './userdb';
import * as fetch from 'node-fetch';
import { YOUTUBEAPIKEY } from './config';
import { logger } from './logger';


export async function getYouTubeList(id, searchArray) {
    var timestamp = new Date;
    var y = await userDb.getYoutubeList(id);
    if (y) y = y.list;
    if (!y || timestamp.getTime() - y.timestamp > 604800000) {
        var res = await fetchYoutubeVideos(searchArray);
        if (res) userDb.addYoutubelist(id, res, timestamp.getTime());
        else res = y;
    }
    else res = y;
    //logger(res);
    return res;  
}

async function fetchYoutubeVideos(searchArray): Promise<any>{
    searchArray = JSON.parse(searchArray);
    var searchString = '';
    searchArray.forEach(s => searchString += '%22'+s+'%22' + '+');
    searchString = searchString.slice(0, -1).replace(/ /g, '+');
    logger('youtube: ' + searchString);
    var r = await getPage(searchString);
    //logger(r)
    var result;
    if (!r.items) result = undefined;
    else { 
        var res = r.items;
        if (r.nextPageToken) {
            r = await getPage(searchString, r.nextPageToken);
            res.push(...r.items);
        }
        result = [];
        res.forEach(v => {
            result.push({
                videoId: v.id.videoId,
                title: v.snippet.title,
                thumbnail: v.snippet.thumbnails.default.url,
                hqthumbnail: v.snippet.thumbnails.high.url,
                description: v.snippet.description   // TODO: get full description https://stackoverflow.com/questions/37480042/how-to-get-full-description-of-youtube-video-using-youtube-api-v3
            });
        })
        //logger(result);
    }
    return result;
  }

async function getPage(searchString, nextPageToken?): Promise<any> {
    const maxResults = 10;
    var pageToken;
    nextPageToken ? pageToken = nextPageToken : pageToken = '';
    let url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&order=relevance&type=video&videoEmbeddable=true&q=' + searchString 
              + '&key=' + YOUTUBEAPIKEY + ' &pageToken=' + pageToken + '&maxresults=' + maxResults;
    return fetch(url)
      .then(r => r.text())
      .then(t => JSON.parse(t))
      .catch(e => logger(e));
}
