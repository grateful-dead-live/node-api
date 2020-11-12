

import * as fetch from 'node-fetch';
import { logger } from './logger';


export async function getArchiveinfo(etree_id) {
  logger('GET');
  const iaurl = "https://archive.org/advancedsearch.php?q=" + etree_id + "&fl%5B%5D=description&fl%5B%5D=notes&fl%5B%5D=source&fl%5B%5D=lineage&fl%5B%5D=subject&fl%5B%5D=date&output=json"
  return fetch(iaurl)
  .then(res => res.json())
  .then(j => {
    return j.response.docs[0];
  })

}
