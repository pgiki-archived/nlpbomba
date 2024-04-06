const moment=require("moment");
const _=require("lodash");
const DEBUG=false;
/*
  cleans all sort of messages and return properly cleaned data
*/
class PostProcessing {
    constructor() {
      this.tag="[PostProcessing]";
      this.miniConfidence=0.75;
      this._miniConfidence=this.miniConfidence; //a copy used to reset
      this.selectedIntent=null;
      this.text=null;
    }

    getObject=(_obj, path, defaultValue=undefined)=>{
            let obj=_.clone(_obj, true)
            if(!path) return obj
            if (obj==null) return defaultValue
            path = `${path}`.split('.');
            var current = obj;
            while(path.length) {
                if(typeof current !== 'object' || typeof path!== 'object') return defaultValue;
                
                if(!path||!current) return current
                current = current[path.shift()];
            }
            if(current==null){
              current=defaultValue
            }
            return current
        }

      createObject = (obj, path=null, value = null) => {
          if(path==null){//then shift the variables
            obj={}
            path=obj
            value=path
          }
          if(!obj){
            obj={}
          }
          path = typeof path === 'string' ? path.split('.') : path;
          let current = obj;
          while (path.length > 1) {
              const [head, ...tail] = path;
              path = tail;
              if (!current[head]) {
                current[head] = {};
              }
              current = current[head];
          }
          current[path[0]] = value;
          return obj;
      }

  
   selectedIntentClean=({intents=[], loggedUser={}, userAccount={}, latestMemo=null, carrier=null, phone=null}={})=>{
     /*
       rearranges accounts to be in a format which is understood by transaction table
     */
     let transactionData=this.selectedIntent;
     if(intents[1] && intents[1].amount<=transactionData.amount && transactionData.confidence===intents[1].confidence){
        transactionData=intents[1]
      }

      // console.log("userAccount", userAccount)
      const anotherUser={
           //the users whose info is extracted from message
            accountID:transactionData.accountID, 
            name:transactionData.accountName, 
            user:this.getObject(loggedUser, "_id"), 
            avatar:null, 
            serviceProvider:null
      }
      if(transactionData.isAmountIn){//TODO: search the user with this ID and upload their ID
          transactionData["accountFirst"]=anotherUser
          transactionData["accountSecond"]=userAccount
      
      }else{//sending money
          transactionData["accountFirst"]=userAccount
          transactionData["accountSecond"]=anotherUser
      }
      //create data
      transactionData.user=this.getObject(loggedUser, "_id");
      transactionData.service=this.getObject(latestMemo, "service");
      transactionData.detail=this.getObject(latestMemo, "payload.memo");
      transactionData.data={text:this.text, intentName:transactionData.intentName, memo:latestMemo};
      // console.log("transactionData", JSON.stringify(transactionData))
      if(transactionData.detail){
         transactionData=this.createObject(transactionData, "data.memo.payload.product", transactionData.detail)
      }
      return transactionData
       
  }
  getCurrency=(str)=>{
      str=str.replace(",", "")
      str=str.replace(",", "")
      str=str.replace(",", "")
      var regex = /[+-]?\d+(\.\d+)?/g;
      var floats = str.match(regex);
      // console.log("string", str, floats)
      if (floats) {
        let amount=parseFloat(floats[0])
        let currency=str.replace(floats[0], "")
        currency=currency.replace(".", "").trim().toUpperCase()
        currency=currency.replace("TSH", "TZS")
        if(!currency){
          currency="TZS"
        }
        return {amount, currency}
      }
      return {amount:null, currency:null}
   }
   
   removePunctuation=(string, all=false)=>{
      var regex = /[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g;
      string=string.replace("kwa", "")
      if(!all){
        regex = /[,]/g;
      }
      string=string.replace(regex, '').trim();
      return string
   }

  formatNumbers=(string)=>{//A quick fix to fix numbers//howevr it looses the decimal part
      if(string.indexOf('.')>-1){
        return string.substr(0, string.indexOf('.'));
      }else{
        return string
      }
  }

  clean=({data, text})=>{
    /*
      calculates score, format numbers etc
    */
    this.text=text;
    let score=0;
    let amountKeys=["amount", "transactionFee", "latestBalance"]
    let keys=Object.keys(data);
    keys.map(key=>{
      let value=data[key]
      if(value){
        score+=1
        if(typeof value==="string"){
          //remove any leading .
          value = value.replace(/[\.\,]\s*$/, "");
          //format numbers
          value=this.formatNumbers(value)
          //remove puctuations
          value=this.removePunctuation(value, true)
          if(this[`${key}Clean`]){
            value=this[`${key}Clean`](value)
          }
          //process currency
          if(amountKeys.includes(key)){
              let {amount, currency}=this.getCurrency(value)
              DEBUG && console.log("amount, currency", amount, currency, "key:=>", key)
              data[key]=amount
              if(currency){
                data.currency=currency
              }
          }else{
            data[key]=value
          }
        }
      }
    })

    data.confidence=score/keys.length
    if(data.confidence>=this.miniConfidence){
      // can be added to selectedIntent
      this.miniConfidence=data.confidence
      this.selectedIntent=data
    }
    return data
   }

   accountNameClean=(name)=>{
     /*
       in most cases names have capital words. 
     */
    let upperCaseWords = name.match(/(\b[A-Z][A-Z]+|\b[A-Z]\b)/g);
    if(upperCaseWords){
        upperCaseWords=upperCaseWords.join(" ")
    }else{
      upperCaseWords=name
    }
    return upperCaseWords
   }

   transactionTimeClean=(value)=>{
      if(moment(value, 'DD-MM-YYYY HH:mm').isValid()){
        value=moment(value, 'DD-MM-YYYY HH:mm').toDate()
      }else{
        value=new Date()
      }
      return value
   }

   sortIntents=(intents)=>{
      intents=_.sortBy(intents, "confidence")
      intents.reverse();
      return intents
   }

}
// const PostProcessingClass=new PostProcessing();
module.exports=PostProcessing;




