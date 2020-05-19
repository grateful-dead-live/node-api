import { MongoClient, Db, ObjectID } from 'mongodb';
import { MONGOURL, MONGODBNAME} from './config';

let db: Db;

export async function connect() {
    let client = await MongoClient.connect(MONGOURL, { useNewUrlParser: true });
    //const dbname = MONGOURL.split("/").pop();
    db = client.db(MONGODBNAME);
  }

export async function addBookmark(userid, route) {
    db.collection('testcollection').updateOne( 
        { userId : userid },
        { $addToSet: { bookmarks : route } },
        { upsert: true }
    )
}

export async function delBookmark(userid, route) {
    db.collection('testcollection').updateOne( 
        { userId : userid },
        { $pull: { bookmarks : route } } 
    )
}

export async function checkBookmark(userid, route) {
    var c = await db.collection('testcollection').count( { 
        userId : userid, 
        bookmarks : { $in: [route] } } );
    console.log(c);
    return c+''
}

export async function getBookmarks(userid) {
    var x = await db.collection('testcollection').find( { 
        userId : userid, 
    }).project({['bookmarks']:1}).toArray();
    return x;
}


export async function _getComments(route) {
    var s = route.split('/');
    var x = await db.collection('testcollection').find( { 
        name : 'comments',
    }).project({ [s[2]]:1}).toArray();
    this.getComments2(route);
    return x;
}

export async function getComments(route) {
    var s = route.split('/');
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
    var s = route.split('/');
    var c = JSON.parse(decodeURIComponent(comment));
    console.log(c)  
    db.collection('testcollection').updateOne( 
        { name : 'comments'},
        { $push: { [s[2]] : c } },
        { upsert: true }
    )
    await this.addComment2(comment, route, userid)
}

export async function addComment2(comment, route, userid) {
    var c = JSON.parse(decodeURIComponent(comment));
    db.collection('testcollection').updateOne( 
        { userId : userid },
        { $addToSet: { comments : { comment : c, route: route} } },
        { upsert: true }
    )
}


export async function checkComment(msgId, route) {
    var s = route.split('/');
    console.log('userdb: '+msgId)
    console.log(s[2]+'.msgId')
    var x = await db.collection('testcollection').count( { 
        name : 'comments',
        [s[2]+'.msgId'] : Number(msgId)
    });
    return x+''
}

export async function getUserCommentRoutes(userid) {
    var x = await db.collection('testcollection').find( 
       { name: 'comments',
        userId: "[userid]"}
    ).toArray();
    console.log(x);
}
