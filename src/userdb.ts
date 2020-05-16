import { MongoClient, Db, ObjectID } from 'mongodb';
import { MONGOURL, MONGODBNAME} from './config';

let db: Db;

export async function connect() {
    let client = await MongoClient.connect(MONGOURL, { useNewUrlParser: true });
    //const dbname = MONGOURL.split("/").pop();
    db = client.db(MONGODBNAME);
  }

export async function addBookmark(userid, route) : Promise<ObjectID> {
    var s = route.split('/');       
    console.log(s)
    db.collection('testcollection').updateOne( 
        { _id : ObjectID(userid)},
        { $addToSet: { ["bookmarks."+s[1]] : s[2] } } ,
        { upsert: true }
    )
}

export async function delBookmark(userid, route) : Promise<ObjectID> {
    var s = route.split('/');
    db.collection('testcollection').updateOne( 
        { _id : ObjectID(userid)},
        { $pull: { ["bookmarks."+s[1]] : s[2] } } 
    )
}

export async function getBookmarks(userid) : Promise<ObjectID> {
    var x = await db.collection('testcollection').find( { 
        _id : ObjectID(userid) 
    }).project({bookmarks:1}).toArray();
    return x;
}


export async function checkBookmark(userid, route) {
    var s = route.split('/');
    var c = await db.collection('testcollection').count({_id: ObjectID(userid) , ["bookmarks."+s[1]]: { $in: [s[2]] } } );
    console.log(c);
    return c+''
}

export async function getComments(route) : Promise<ObjectID> {
    var s = route.split('/');
    var x = await db.collection('testcollection').find( { 
        name : 'comments',
    }).project({ [s[2]]:1}).toArray();
    return x;
}

export async function addComment(comment, route) : Promise<ObjectID> {
    var s = route.split('/');
    var c = JSON.parse(decodeURIComponent(comment));
    console.log(c)       
    db.collection('testcollection').updateOne( 
        { name : 'comments'},
        { $addToSet: { [s[2]] : c } }
    )
}

export async function checkComment(msgId, route) {
    var s = route.split('/');
    console.log('userdb: '+msgId)
    console.log(s[2]+'.msgId')
    var x = await db.collection('testcollection').find( { 
        name : 'comments',
        [s[2]+'.msgId'] : Number(msgId)
    }).toArray()
    return x
}
