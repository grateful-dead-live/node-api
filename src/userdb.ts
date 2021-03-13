import { MongoClient, Db, ObjectID } from 'mongodb';
import { MONGOURL, MONGODBNAME, MONGODBCOLLECTION } from './config';
import { logger} from './logger';
import { MailService } from './mail-service';

let db: Db;
let dbcollection: any;
let dbtracklists: any;
let dbyoutube: any;
let dbnews: any;

export async function connect() {
    let client = await MongoClient.connect(MONGOURL, { useNewUrlParser: true, useUnifiedTopology: true });
    //const dbname = MONGOURL.split("/").pop();
    db = client.db(MONGODBNAME);
    dbcollection = db.collection(MONGODBCOLLECTION);
    dbtracklists = db.collection('tracklists');
    dbyoutube = db.collection('youtube2');
    dbnews= db.collection('news2');
  }

export async function addBookmark(userid, route, time, title) {
    dbcollection.updateOne( 
        { userId : userid },
        { $addToSet: { bookmarks : {route: route, timestamp: time, title: title} } },
        { upsert: true }
    )
}

export async function delBookmark(userid, route) {
    dbcollection.updateOne( 
        { userId : userid },
        { $pull: { bookmarks : {route:route} } } 
    )
}

export async function checkBookmark(userid, route) {
    var c = await dbcollection.countDocuments( { 
        userId : userid, 
        'bookmarks.route' : route } );
    return c+''
}

export async function getBookmarks(userid) {
    var x = await dbcollection.find( { 
        userId : userid, 
    }).project({'bookmarks':1}).toArray();
    return x;
}




export async function like(userid, route, time, title) {
    dbcollection.updateOne( 
        { userId : userid },
        { $addToSet: { likes : {route: route, timestamp: time, title: title} } },
        { upsert: true }
    )
}

export async function unlike(userid, route) {
    dbcollection.updateOne( 
        { userId : userid },
        { $pull: { likes : {route:route} } } 
    )
}

export async function checkLike(userid, route) {
    var c = await dbcollection.countDocuments( { 
        userId : userid, 
        'likes.route' : route } );
    return c+''
}

export async function countLikes(route) {
    var x = await dbcollection.countDocuments( { 
       'likes.route' : route
    } )
    return x+'';
}

export async function getLikes(userid) {
    var x = await dbcollection.find( { 
        userId : userid, 
    }).project({'likes':1}).toArray();
    logger(x)
    return x;
}


export async function getComments(route) {
    var result = await dbcollection.aggregate([
        {$match: {'comments.route': route}},
        {$project: {
            comments: {$filter: {
                input: '$comments',
                as: 'comment',
                cond: {$eq: ['$$comment.route', route]}
            }},
            _id: 0
        }},
    ]).toArray();
    var b = [];
    result.forEach(i => i.comments.forEach(r => b.push(r.comment)));
    return b;
}

export async function addComment(comment, route, userid, title) {
    var c = JSON.parse(decodeURIComponent(comment));
    dbcollection.updateOne( 
        { userId: userid },
        { $addToSet: { comments : { comment : c, route: route, title: title} } },
        { upsert: true }
    )
}

export async function checkComment(msgId) {
    var result = await dbcollection.countDocuments({
        'comments.comment.msgId': msgId
    });
    return result+'';
}

export async function getUserComments(userid) {
    var res = await dbcollection.find( { 
        userId : userid, 
    }).project({'comments':1}).toArray();
    return res;
}

export async function sendCommentReport(comment, userid) {
    var c = JSON.stringify(JSON.parse(decodeURIComponent(comment)), null, 2 );
    let mailService = new MailService();
    return mailService.sendMail(  
        'a comment has been reported',  
        'The following comment has been reported by user ' + userid + ':\n' + c)
        .then( msg => { return msg } )
        .catch(err => { return err } );
}

export async function sendFeedback(comment, userid) {
    var c = JSON.stringify(JSON.parse(decodeURIComponent(comment)), null, 2 );
    let mailService = new MailService();
    return mailService.sendMail(  
        'app feedback',  
        'The following feedback has been sent by user ' + userid + ':\n' + c)
        .then( msg => { return msg } )
        .catch(err => { return err } );
}

export async function addPlaylist(name, playlist, playlistid, userid, time) {
    var p = JSON.parse(decodeURIComponent(playlist));
    dbcollection.updateOne( 
        { userId: userid },
        { $addToSet: { playlists : { name: name, playlist : p, id: playlistid, timestamp: time } } },
        { upsert: true }
    )
}

export async function getPlaylists(userid) {
    var res = await dbcollection.find( { 
        userId : userid, 
    }).project({'playlists':1}).toArray();
    return res;
}

export async function getPlaylist(playlistid) {
    var res = await dbcollection.find( { 
        'playlists.id' : playlistid, 
    }).project({'playlists.$':1, userId: 1, _id: 0}).toArray();
    return res[0];
}

export async function delPlaylist(userid, playlistid) {
    logger('delete: ' + playlistid);
    dbcollection.updateOne( 
        { userId : userid },
        { $pull: { playlists : {id:playlistid} } } 
    )
}

export async function deleteComment(msgid, userid) {
    logger('delete: ' + msgid);
    dbcollection.updateOne( 
        { userId : userid },
        { $pull: {'comments' : {'comment.msgId': msgid} } } 
    )

}

export async function getTracklist(etreeid) {
    var res = await dbtracklists.find( { 
        etree_id : etreeid, 
    }).project({'tracklist':1}).toArray();
    res = sortTracklist(res[0].tracklist)
    return res
}


export async function getSongsById(songid) {
    var result = await dbtracklists.find(
        { 'tracklist.sort.song_id': songid },
    ).project({ 'tracklist.$':1, etree_id: 1, _id: 0}).toArray();
    return result
}

function sortTracklist(t){
    if (t[0].track) {
        t.sort(function(a, b) { return a.track - b.track });
    }
    else {
        t.sort((a, b) => { a.filename.localeCompare(b.filename) });
    }
    return t
}

export async function getYoutubeList(id) {
    var res = await dbyoutube.find( { 
        id: id, 
    }).project({_id: 0, id: 0}).toArray();
    return res[0];
}

export async function addYoutubelist(id, list, timestamp) {
    dbyoutube.updateOne( 
        { id: id },
        { $set: { list: list, timestamp: timestamp } },
        { upsert: true }
    )
}

export async function getNews(id, source) {
    var res = await dbnews.find( { 
        id : id, 
        source: source
    }).project({_id: 0, id: 0}).toArray();
    return res[0];
}

export async function addNews(id, list, timestamp, source) {
    dbnews.updateOne( 
        { id: id, source: source },
        { $set: { list: list, timestamp: timestamp, source: source } },
        { upsert: true }
    )
}

export async function getNumberofUsers() {
    var res = await dbcollection.countDocuments();
    return res+''
    //return res[0];
}
