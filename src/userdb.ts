import { MongoClient, Db, ObjectID } from 'mongodb';
import { MONGOURL, MONGODBNAME} from './config';
import { MailService } from './mail-service';

let db: Db;

export async function connect() {
    let client = await MongoClient.connect(MONGOURL, { useNewUrlParser: true });
    //const dbname = MONGOURL.split("/").pop();
    db = client.db(MONGODBNAME);
  }

export async function addBookmark(userid, route, time) {
    db.collection('testcollection').updateOne( 
        { userId : userid },
        { $addToSet: { bookmarks : {route: route, timestamp: time} } },
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

export async function addComment(comment, route, userid) {
    var c = JSON.parse(decodeURIComponent(comment));
    db.collection('testcollection').updateOne( 
        { userId: userid },
        { $addToSet: { comments : { comment : c, route: route} } },
        { upsert: true }
    )
}

export async function checkComment(msgId, route) {
    var result = await db.collection('testcollection').count({
        'comments.comment.msgId': Number(msgId)
    });
    console.log(result);
    return result+'';
}

//TODO: make work!
export async function getUserCommentRoutes(userid) {   
    var result = await db.collection('testcollection').find( 
        { 'userId': userid }
        ).project({'comments.route':1}).toArray();
    var r = [];
    if (result != []){ 
        result[0].comments.forEach(i => {
            r = r.filter(f => f !== i.route).concat([i.route])
        })
    }
    return r
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

export async function addPlaylist(playlist, playlistid, userid) {
    var p = JSON.parse(decodeURIComponent(playlist));
    db.collection('testcollection').updateOne( 
        { userId: userid },
        { $addToSet: { playlists : { playlist : p, id: playlistid} } },
        { upsert: true }
    )
}