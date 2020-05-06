import { MongoClient, Db, ObjectID } from 'mongodb';
import { MONGOURL} from './config';

let db: Db;

export async function connect() {
    let client = await MongoClient.connect(MONGOURL, { useNewUrlParser: true });
    const dbname = MONGOURL.split("/").pop();
    db = client.db(dbname);
  }