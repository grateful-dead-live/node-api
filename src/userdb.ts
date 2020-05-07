import { MongoClient, Db, ObjectID } from 'mongodb';
import { MONGOURL, MONGODBNAME} from './config';

let db: Db;

export async function connect() {
    let client = await MongoClient.connect(MONGOURL, { useNewUrlParser: true });
    //const dbname = MONGOURL.split("/").pop();
    db = client.db(MONGODBNAME);
  }

export async function testpost(userid, data) : Promise<ObjectID> {
    db.collection('testcollection').insertOne( { _id : ObjectID(userid), data } )
}

export async function testdel(userid) : Promise<ObjectID> {
    db.collection('testcollection').deleteOne( { _id : ObjectID(userid) } )
}