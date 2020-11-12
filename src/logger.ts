
import { DEBUG } from './config'

const log = require('log-to-file');

export function logger(s) {
    if (DEBUG) {
        console.log(s);
    }
    //log(s, '../gd.log');    
  }