const http = require('http');
const fetch = require('node-fetch');
const _=require("lodash");
const qs =require('query-string');
const providers=require("./providers");
const PostProcessing=require("./PostProcessing");
const baseURL="https://lipabomba.com";
const DEBUG=false;
const PORT=8080;
// initialize it here and then process it later
var postProcessing={}

const getSearchParams=(str)=>{
      let data={}
      try{
         if (!str) return data
          const regex=/(\?)\w+/;
          const index=str.search(/(\?)\w+/i)
          if(index>-1){
            data= qs.parse(str.slice(index))
          }else{
            data= qs.parse(str)
         }
         //clean data by removing []
         let cleanedData={}
         Object.keys(data).map(key=>{
           const _key=key.split("[]")[0]
           cleanedData[_key]=data[key]
         })
         return cleanedData
        }catch(error){
        return data
      }
  }


const api=({link, data, token, language="en", method="GET", headers={'Content-Type': 'application/json'}}={})=>{
         headers={
            'Accept': 'application/json',
            'Accept-Language': language,
             ...headers
          }
          if (token){
            headers={'Authorization': 'Token '+token, ...headers}
           }
           if(link && !link.startsWith("http")){
             link=`${baseURL}${link}`
           }
           return fetch(link, {
              method,
              body: method==="POST"?JSON.stringify(data):undefined,
              headers,
            }).then(response=>{
              return response.json()
            }).catch(error=>{
             DEBUG && console.log("error", error)
        })
}

const getIntents=(text)=>{
      // initialize class here
      postProcessing=new PostProcessing();
      let intents=[]
      let textCleaned=text.replace(/(N|n)o\.[:]{0,}/g, ' ')
                            .replace(/Tsh/gi, '')
                              .replace(/\-/g, ' ')
                                .replace(/\./g, ' . ');
      
      Object.keys(providers).map(intentName=>{
          const params=providers[intentName]({text:textCleaned})
          const processedData=postProcessing.clean({data:{...params, intentName}, text})
          intents.push(processedData)
      });
      // remove ones with weird data types
      intents=intents.filter(intent=>(
       intent.accountName &&  intent.accountName.toLowerCase()!=="wakala")
      )
      intents=_.sortBy(intents, "confidence");
      intents.reverse();
      //reset confidence
      return {
        selectedIntent:postProcessing.selectedIntent,
        intents
      };
      // DEBUG && console.log("intents", intents)
}
/*
----START APP
*/

let express = require('express');
let app = express();
app.use(express.json());
const nlp = ({request, response, data={}, accessToken=null}={})=>{
  
  // response.setHeader('Content-Type', 'application/json');
  // response.writeHead(200);
  // const text=`Umetuma kikamilifu kwenda kwa mpokeaji wa Halotel WILBARD DAMAS SHIRIMA - 0625752210. Kiasi TSh 1,500. Ada TSh 50. VAT TSh 8. Salio jipya ni TSh 120,178. Muamala: 93685440123. Risiti: 481746076. 18/09/20 11:26.`
  // console.log("res", res, "req", req)
  // console.log('Now we have a http message with headers but no data yet.');
  
  let results={
      selectedIntent:null, 
      intents:[], 
      events:[{
         "event":"log",
         "message":"The message field was not submitted"
      }],
      detail:"The message field was not submitted. Also be reminded that this endpoint only accept POST and GET requests",
  };

  const addLog=(message)=>{
      message=`${message}: Data: ${JSON.stringify(data)}`
      if(results.events && results.events[0]){
        results.events[0].message=message
      }else{
        results.events=[{
         "event":"log",
          message     
      }]
    }  
  }
  const responseEnd=(results)=>{
    // reset postProcessing instance
    postProcessing.selectedIntent=null;
    postProcessing.miniConfidence=postProcessing._miniConfidence;
    // response.send(JSON.stringify(results, null, 3));
    response.send({...data, ...results});
  }

  DEBUG && console.log("data", data)
  DEBUG && console.log("eq.url", request.url, "accessToken", accessToken, getSearchParams(request.url))
  DEBUG && console.log("parsed data", data, typeof data, data.message) // 'Buy the milk'
  
  if(data && data.message){
    results.detail=undefined;
    const {message, phone_number:phone, from:senderPhone}=data;
    if(message){
      results=getIntents(message);
      results.events=[];
      DEBUG && console.log("message submitted", message)
      if(results.selectedIntent){
        /*TODO
          1. Fetch user profile with credentials: loggedUser, userAccount, token for posting
          2. Post to an API and add the response
        */
        const link=`/api/v1/account/token/${accessToken}/`
        api({link})
         .then(accountInfo=>{
          DEBUG && console.log("data 101", accountInfo)
           const {user:loggedUser, token, account, error}=accountInfo;
            if(!error){
              
              results.selectedIntentCleaned=postProcessing.selectedIntentClean({
                  intents:results.intents, 
                  loggedUser, 
                  userAccount:account, 
                  latestMemo:null, 
                  carrier:null, 
                  phone:account.accountID
              });

              DEBUG && console.log("results.selectedIntentCleaned", results.selectedIntentCleaned)
              //then post the data to the server to be added
              results.selectedIntentCleaned && api({
                  link:"/api/v1/transaction/",
                  token,
                  data:results.selectedIntentCleaned,
                  method:"POST",
              }).then(res=>{
                DEBUG && console.log("Added transaction", res)
                addLog(`Transaction (${res._id}) added[${message}]`)
                results.selectedIntentCleaned=res;
              }).catch(error=>{
                DEBUG && console.log("Error adding transaction", error)
                addLog("Error adding transaction: "+error);
              }).finally(()=>{
                responseEnd(results);
              })
            }else{
              //not valid response
              addLog("Error 104: "+error);
              DEBUG && console.log("Error 104", error)
              results={...results, ...accountInfo}
              responseEnd(results);
           }
        }).catch(error=>{
          DEBUG && console.log("Error getting data", error)
          addLog("Error 105 getting data: "+error);
        }).finally(()=>{
          // responseEnd(results);
        })
      }else{
        // NO selected intent here
        results.detail="The message submitted isn't a valid transaction message"
        addLog("Error 106. The message submitted isn't a valid transaction message");
        responseEnd(results);
      }
    }
  }else{
    //!no any data was passed
    addLog("Error 107. no valid data was submitted");
    responseEnd(results);
  }
}
// ROUTING
app.post('/token/:accessToken', function(request, response){
   let accessToken=request.params.accessToken;     // your JSON
   nlp({request, response, accessToken, data:request.body});
});
app.get('/token/:accessToken', function(request, response){
   // console.log(request.body);      // your JSON
   let accessToken=request.params.accessToken;
   nlp({request, response, accessToken, data:getSearchParams(request.url)});
});
app.listen(PORT);
/*
  ---END APP---
*/
