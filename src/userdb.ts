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
    var x = db.collection('testcollection').find( 
        { _id : ObjectID(userid) }
    ).toArray()
    return x;
}