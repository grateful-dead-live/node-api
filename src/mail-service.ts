import * as nodemailer from 'nodemailer';
import { GMAILUSER, GMAILPASS } from './config'
 
    export class MailService { 
      private _transporter: nodemailer.Transporter; 
      constructor() { 
        this._transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true, // use SSL
          auth: {
              user: GMAILUSER + '@gmail.com',
              pass: GMAILPASS
          }
        });
      } 


      sendMail(subject: string, content: string) : Promise<void> {   
        let options = { 
          from: GMAILUSER + '@gmail.com', 
          to: GMAILUSER + '@gmail.com', 
          subject: subject, 
          text: content 
        } 
 
      return new Promise<void> ( 
        (resolve: (msg: any) => void,  
          reject: (err: Error) => void) => { 
            this._transporter.sendMail(  
              options, (error, info) => { 
                if (error) { 
                  console.log(`error: ${error}`); 
                  reject(error); 
                } else { 
                    console.log(`Message Sent 
                      ${info.response}`); 
                    resolve(`Message Sent  
                      ${info.response}`); 
                } 
            }) 
          } 
        ); 
      } 

  }







        
 

 