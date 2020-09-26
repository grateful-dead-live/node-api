import * as request from 'request-promise';
import * as _ from 'lodash';
import { GUARDIANAPIKEY, NYTAPIKEY, logger } from './config';
import { News } from './types';
const DAYS_PRIOR = 7;

interface TimesNews { //selected fields
  web_url: string, //'https://www.nytimes.com/1994/03/17/business/company-news-heinz-to-acquire-foreign-baby-food-businesses.html'
  lead_paragraph: string, //"The chairman of the H. J. Heinz Company, Anthony J. F. O'Reilly, said yesterday ..."
  abstract: string, //"  The chairman of the H. J. Heinz Company, Anthony J. F. O'Reilly, said yesterday ..."
  source: string, //'The New York Times'
  headline: TimesHeadline,
  pub_date: string, //'1994-03-17T05:00:00+0000'
  document_type: string, //'article'
  news_desk: string, //'Financial Desk'
  section_name: string, //'Business Day'
  type_of_material: string, // 'News'
  word_count: number, //89
  uri: string //'nyt://article/97729bcc-1a77-55f5-8719-39b7193b3954'
}

interface TimesHeadline {
  main: string, //'HEINZ TO ACQUIRE FOREIGN BABY FOOD BUSINESSES'
  kicker: string, //'COMPANY NEWS'
  print_headline: string //'COMPANY NEWS; HEINZ TO ACQUIRE FOREIGN BABY FOOD BUSINESSES'
}

interface GuardianNews {
  id: string, //"world/1969/jun/06/secondworldwar.fromthearchive",
  type: string, //"article"
  sectionId: string, //"world"
  sectionName: string, //"World news"
  webPublicationDate: string, //"1969-06-06T11:36:13Z"
  webTitle: string, //"'No one expected us to survive'"
  webUrl: string, //"https://www.theguardian.com/world/1969/jun/06/secondworldwar.fromthearchive"
  apiUrl: string, //"https://content.guardianapis.com/world/1969/jun/06/secondworldwar.fromthearchive"
  isHosted: boolean, //false
  pillarId: string, //"pillar/news"
  pillarName: string //"News"
}

export async function getNewsFromNytimes(toDate: string): Promise<News[]> {
  try {
    const fromDate = getFromDate(toDate);
    const body = await request({
      url: "https://api.nytimes.com/svc/search/v2/articlesearch.json",
      qs: {
        'api-key': NYTAPIKEY,
        'begin_date': fromDate.replace(/-/g, ''),
        'end_date': toDate.replace(/-/g, ''),
        'fq': 'type_of_material:("News")'
      },
    });
    const articles: TimesNews[] = JSON.parse(body).response.docs;
    return articles.map(a => ({
      source: a.source,
      title: _.words(a.headline.main).map(_.capitalize).join(' '),
      date: a.pub_date.slice(0, 10),
      url: a.web_url
    }));
  } catch (err) {
    logger(err);
    return Promise.resolve([]);
  }
}

export async function getNewsFromGuardian(toDate: string): Promise<News[]> {
  const fromDate = getFromDate(toDate);
  try {
    const body = await request({
      url: "https://content.guardianapis.com/search",
      qs: {
        'api-key': GUARDIANAPIKEY,
        'from-date': fromDate,
        'to-date': toDate
      },
    });
    const articles: GuardianNews[] = JSON.parse(body).response.results;
    return articles.map(a => ({
      source: "The Guardian",
      title: _.words(a.webTitle).map(_.capitalize).join(' '),
      date: a.webPublicationDate.slice(0, 10),
      url: a.webUrl
    }));
  } catch (err) {
    logger(err);
    return Promise.resolve([]);
  }
}

function getFromDate(toDate: string) {
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - DAYS_PRIOR);
  return fromDate.toISOString().substring(0, 10);
}