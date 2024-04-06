const moment=require("moment");
const _=require("lodash");
const nlp =require("compromise");

const preProcessAmount=(value)=>{
  /*
    sometimes account ID is mistaken for amount so check here to fix stuff
  */

  if(value && value.length>8){
    value=""
  }

  return value
}

const providers={
    halotel:({text})=>{
      let doc=nlp(text)
      let detail=""
      let confirmationCode=doc.match('(id|muamamala|muamala)').lookAhead('#Value').out('array')[0]
      let transactionTime=doc.match('(tarehe|mnamo|on|time|wakati|kumbukumbu)').lookAhead('#Date').out('array').join(" ")
      
      let amount=doc.match('(received|paid|sent|umetoa|umetuma|umepokea)').lookAhead('#Value')
                    .out('array').slice(0,1).join(" ")||doc.match('(was)').lookBehind('#Value')
                    .out('array').slice(0,1).join(" ");
       
      let accountName=doc.match('(kutoka|kwa|from|name)').lookAhead('(#Value|#Noun)')
                    .out('array') 
                    .filter(y=>{
                      //filter only ones which are all caps
                    let results=y.match(/[A-Z]+/)
                    if(results && results[0]===y){
                      return true
                    }
                  }).join(" ")
        
      let accountID=doc.match('(number|utambulisho|namba|mpokeaji)').lookAhead('#Value').out('array')[0];
      let transactionFee=doc.match('(ada|charged|fee)').lookAhead('#value').out('array').join(" ");
      let latestBalance=doc.match('(new|salio)').lookAhead('#value').out('array').join(" ");
      let isAmountIn=true;

      if(confirmationCode===accountID){
         accountID=doc.match('(ada|wakati)').lookBehind('#Value').out('array').slice(-1)[0];
       }
        
      if(doc.has("maongezi") ||doc.has("Bundle")){
        isAmountIn=false; 
        accountName="Airtime and Bundle";
        detail=accountName
       }
      
      if(!accountID){//in some cases account ID misses
        accountID=accountName
      }

      // console.log("Tigo transactionTime", transactionTime)
      
       if(!transactionTime){
         transactionTime=new Date()
       }

      let spending=["umelipa", "umenunua", "umenunua", "spent", "umetuma", "imetumwa", "paid", "umetoa"];
        spending.map(keyWord=>{//TODO; break once found value
        if(doc.has(keyWord)){
            isAmountIn=false; 
          }
        })

      amount=preProcessAmount(amount);

      const data={
        detail,
        confirmationCode, transactionTime, amount,  
                  accountID,accountName, transactionFee, latestBalance, isAmountIn
                 }
      return data
    },

  airtel:({text})=>{
      const cleanConfirmationCode=(value)=>{
        if(!value) return value
        return value.split(".").slice(0,3).join(".")
      }
      const cleanAccountID=(value)=>{
        if(!value) return value
        return value //.split(",")
      }
      
     const cleanAccountName=(value)=>{
        if(!value) return value
        return value.split(",").slice(-1)[0]
      }
     
     let cleanedText=text.match(/[^_\W]+/g).join(' ')
      let doc=nlp(text)
      let cleanedDoc=nlp(cleanedText);
      let detail=""
      let confirmationCode=cleanConfirmationCode(
        doc.match('(rejea|refer|muamala|kumbukumbu)').lookAhead('(#Noun|#Value)').out('array')[0]
        )
      //not available in most messages
      let transactionTime=JSON.parse(JSON.stringify(new Date())).toString()
      let amount=doc.match('(kutoka|imetumwa|to|from|kwenda)').lookBehind('#Value').out('array').slice(-1).join(" ");
      let accountName=cleanAccountName(doc.match('(kutoka|kwa|from|to)').lookAhead('#Noun').out('array').slice(0,2).join(" "));
      let accountID=cleanAccountID(cleanedDoc.match('(kutoka|kwa|from|to)').lookAhead('#Value').out('array')[0]);
      let transactionFee=doc.match('(ada ya|charged|kamisheni)').lookAhead('#Value').out('array').join(" ");
      let latestBalance=doc.match('(ni|is)').lookAhead('#Value').out('array').slice(0,1).join(" ");
      let isAmountIn=true;

      if(doc.has("maongezi")){
        isAmountIn=false; 
        accountName='Airtime and Bundle';
        detail=accountName
       }
      let spending=["umelipa", "umenunua", "umenunua", "spent", "umetuma", "imetumwa", "ada", "fee"]
      spending.map(keyWord=>{//TODO; break once found value
        if(doc.has(keyWord)){
          isAmountIn=false; 
        }
      })

      if(accountID && accountID.includes(",")){ //this is currency mistaken for account ID
        accountID=accountName
      }
      if(!accountID){//in some cases account ID misses
        accountID=accountName
      }

     if(!confirmationCode){//sometimes confirmationCode is not picked up so use an alternative approach
       confirmationCode=text.split(" ")[0]
     }
     amount=preProcessAmount(amount);
     return {detail, confirmationCode, transactionTime, amount, accountID,accountName, transactionFee, latestBalance, isAmountIn}
   },
  vodacom:({text})=>{
      let doc=nlp(text)
      let detail=""
      let confirmationCode=doc.match('(imethibitishwa|confirmed)').lookBehind('#Noun').out('array')[0]
      let transactionTime=doc.match('(tarehe|mnamo|on)').lookAhead('#Date').out('array').join(" ")
      let amount=doc.match('(kutoka|imetumwa|to|from)').lookBehind('#Noun').out('array').slice(-1).join(" ");
      let accountName=doc.match('(kutoka|kwa|from|to)').lookAhead('#Noun').out('array').slice(0,3).join(" ");
      let accountID=doc.match('(kutoka|kwa|from|to)').lookAhead('#Value').out('array').slice(-1)[0];
      let transactionFee=doc.match('(ada ya|charged)').lookAhead('#Noun').out('array').join(" ");
      let latestBalance=doc.match('(ni|is)').lookAhead('#Noun').out('array').join(" ");
      let isAmountIn=true;

      if(doc.has("maongezi")){
        isAmountIn=false; 
        accountName="Airtime and Bundle";
        detail=accountName
       }
      let spending=["umelipa", "umenunua", "umenunua", "spent", "umetuma", "imetumwa", "ada", "fee"]
      spending.map(keyWord=>{//TODO; break once found value
        if(doc.has(keyWord)){
          isAmountIn=false; 
        }
      })
        
      if(accountID && accountID.includes(",")){ //this is currency mistaken for account ID
        accountID=accountName
      }
      if(!accountID){//in some cases account ID misses
        accountID=accountName
      }

     if(!confirmationCode){//sometimes confirmationCode is not picked up so use an alternative approach
       confirmationCode=text.split(" ")[0]
     }
     amount=preProcessAmount(amount);
     return {detail, confirmationCode, transactionTime, amount, accountID,accountName, transactionFee, latestBalance, isAmountIn}
    },

tigo:({text})=>{
    //clean unneccessary breaks
    text=text.replace(/Tsh/gi, '')
    text=text.replace(/No\./gi, 'No');
    text=text.split(".").join(". ");
    let doc=nlp(text)
    // return text
    // return doc.json()
    let detail="";

    let confirmationCode=doc.match('(kumbukumbu|muamala)')
                            .lookAhead('#Value').out('array')[0]

    
    let transactionTime=doc.match('#Date').out('array').join(" ");
    let amount=doc.match('(umelipa|ankara|umepokea|kiasi)').lookAhead('(#Value)').out('array')[0]||
               doc.match('(umetuma|umelipa|wa|ankara|umepokea|kiasi)').lookAhead('(#Value)').out('array')[0];
     
    let accountName=doc.match('(to|vodacom|kwa|wakala|ya|kikamilifu|kwenda)')
                        .lookAhead('#acronym').out('array').slice(1);
    if(!accountName[0]){
        accountName=doc.match('(to|vodacom|kwa|wakala|ya|kikamilifu|kwenda)')
                        .lookAhead('(#Value|#Noun|)').out('array').slice(0,3);
    }
    accountName=[...new Set(accountName)].join(" ")

    let accountID=doc.match('(kutoka|kwa|from|to|kampuni|kwenda)').lookAhead('#Value').out('array').slice(-1)[0];
    let transactionFee=doc.match('(ada|charged)').lookAhead('#Value').out('array').join(" ");
    let latestBalance=doc.match('(ni|is|jipya)').lookAhead('#Value').out('array')[0];
    let isAmountIn=true;
    if(doc.has("maongezi")|(doc.has("malipo") && doc.has("kumbukumbu") && !accountID)){
      isAmountIn=false; 
      accountName=accountName||"Airtime and Bundle";
      detail=accountName
      transactionFee=0.0;
      if(!transactionTime){
        transactionTime=JSON.parse(JSON.stringify(new Date()));
      }
    }
    let spending=["umelipa", "umenunua", "umenunua", "spent", "umetuma", "imetumwa", "malipo"]
    spending.map(keyWord=>{//TODO; break once found value
      if(doc.has(keyWord)){
        isAmountIn=false; 
      }
    })
    
    if(accountID && accountID.includes(",")){ //this is currency mistaken for account ID
      accountID=accountName
    }
    if(!accountID){//in some cases account ID misses
      accountID=accountName
    }
   amount=preProcessAmount(amount);
   let data= {
               detail,
               confirmationCode, 
               transactionTime, amount, accountID,accountName, transactionFee, latestBalance, 
               isAmountIn
             }
   return data
  }
}
// export default providers;
module.exports=providers;






