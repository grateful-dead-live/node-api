import { MongoClient, Db, ObjectID } from 'mongodb';
import { MONGOURL, MONGODBNAME} from './config';
import { MailService } from './mail-service';

let db: Db;

export async function connect() {
    let client = await MongoClient.connect(MONGOURL, { useNewUrlParser: true });
    //const dbname = MONGOURL.split("/").pop();
    db = client.db(MONGODBNAME);
  }

export async function addBookmark(userid, route, time, title) {
    db.collection('testcollection').updateOne( 
        { userId : userid },
        { $addToSet: { bookmarks : {route: route, timestamp: time, title: title} } },
        { upsert: true }
    )
}

export async function delBookmark(userid, route) {
    db.collection('testcollection').updateOne( 
        { userId : userid },
        { $pull: { bookmarks : {route:route} } } 
    )
}

export async function checkBookmark(userid, route) {
    var c = await db.collection('testcollection').count( { 
        userId : userid, 
        'bookmarks.route' : route } );
    console.log(c);
    return c+''
}

export async function getBookmarks(userid) {
    var x = await db.collection('testcollection').find( { 
        userId : userid, 
    }).project({'bookmarks':1}).toArray();
    return x;
}

export async function getComments(route) {
    var result = await db.collection('testcollection').aggregate([
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
    db.collection('testcollection').updateOne( 
        { userId: userid },
        { $addToSet: { comments : { comment : c, route: route, title: title} } },
        { upsert: true }
    )
}

export async function checkComment(msgId) {
    var result = await db.collection('testcollection').count({
        'comments.comment.msgId': Number(msgId)
    });
    console.log(result);
    return result+'';
}

export async function getUserComments(userid) {
    var res = await db.collection('testcollection').find( { 
        userId : userid, 
    }).project({'comments':1}).toArray();
    return res;
}

export async function sendCommentReport(comment, userid) {
    var res;
    var c = JSON.stringify(JSON.parse(decodeURIComponent(comment)), null, 2 );
    let mailService = new MailService();
    return mailService.sendMail(  
        'a comment has been reported',  
        'The following comment has been reported by user ' + userid + ':\n' + c)
        .then( msg => { return msg } )
        .catch(err => { return err } );
}

export async function addPlaylist(name, playlist, playlistid, userid, time) {
    var p = JSON.parse(decodeURIComponent(playlist));
    db.collection('testcollection').updateOne( 
        { userId: userid },
        { $addToSet: { playlists : { name: name, playlist : p, id: playlistid, timestamp: time } } },
        { upsert: true }
    )
}

export async function getPlaylists(userid) {
    var res = await db.collection('testcollection').find( { 
        userId : userid, 
    }).project({'playlists':1}).toArray();
    return res;
}

export async function delPlaylist(userid, playlistid) {
    console.log('delete: ' + playlistid);
    db.collection('testcollection').updateOne( 
        { userId : userid },
        { $pull: { playlists : {id:playlistid} } } 
    )
}

export async function deleteComment(msgid, userid) {
    console.log('delete: ' + msgid);
    db.collection('testcollection').updateOne( 
        { userId : userid },
        { $pull: {'comments' : {'comment.msgId': Number(msgid)} } } 
    )
}