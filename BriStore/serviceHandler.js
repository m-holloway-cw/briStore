var mongo = require('./mongoUtil');
var ObjectID = require('mongodb').ObjectID;


module.exports.init = init;
module.exports.getGiveawayStatus = getGiveawayStatus;
module.exports.enterGiveaway = enterGiveaway;

var DB;

function init(db){
  DB = db;
}


//https://api.printful.com/orders/estimate-costs
//authorization bearer token
//request example {"recipient":{"addr":"123"...},"items":[{"qty"}...]}
//return example data.result.costs.subtotal costs.shipping costs.tax costs.total costs.vat costs.currency
//process -> cart -> estimate costs -> checkout -> payment -> submit order to printful



//expected return values:
// 100 = already entered
// 200 OK = not found, ready to enter
// 401 = user login not found, unauthorize
// 500 = server error contact me
async function getGiveawayStatus(user, callback){
  await DB.collection("features").find().toArray(async function(err, result) {
    if (err) throw err;
    var entrantArray = result[0].entries;
    var username = user.data[0].login;
    //console.log(entrantArray);
    if(entrantArray && username in entrantArray){
      callback('100'); //found already entered, ticket count handled on front end with isSub
    } else if(entrantArray) {
      callback('200 OK'); //okay to enter
    } else {
      callback('500'); //error occured getting the array
    }
  });
}

async function enterGiveaway(user, callback){
  await DB.collection("features").find().toArray(async function(err, result) {
    if (err) throw err;
    var entrantArray = result[0].entries;
    var username = user.data[0].login;
    //console.log(entrantArray);
    if(entrantArray && username in entrantArray){
      callback('100'); //found already entered, ticket count handled on front end with isSub
    } else if(entrantArray){
      enterUser(user, entrantArray);
      callback('200 OK'); //okay to enter
    } else {
      callback('500'); //error occured getting the array
    }
  });
}

async function enterUser(user, entrantArray){
  await DB.collection("features").find().toArray(function(err, result){
    if(err) throw err;
    var entrantArray = result[0].entries;
    var username = user.data[0].login;
    var isSub = user.isSub;
    entrantArray[username] = isSub;
    //console.log(entrantArray)
    DB.collection("features").updateOne(
      {"_id": ObjectID("")},
      {$set: {
        entries: entrantArray
      }});
  });
}


async function getGiveawayEntries(callback){
    await DB.collection("features").find().toArray(function(err, result){
      if(err){
        callback('500');
      };
      var entrantArray = result[0].entries;
      callback(entrantArray);
    });
}

async function getGiveawayWinners(callback){
    await DB.collection("features").find().toArray(function(err, result){
      if(err){
        callback('500');
      };
      var winnerArray = result[0].winners;
      callback(winnerArray);
    });
}
