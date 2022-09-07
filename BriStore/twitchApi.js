module.exports.getRequest = getRequest;
module.exports.getSubStatus = getSubStatus;
module.exports.postRequest = postRequest;

var mongo = require('./mongoUtil');
var request = require('request');
var ObjectID = require('mongodb').ObjectID;



//example url https://api.twitch.tv/helix/users?login=
//incoming param should be as follows
//getRequest(users?login=)
//getRequest(streams?user_login=)
async function getRequest(url, callback){
  var db = mongo.getDb();
  db.collection('config').find().toArray(async function (err, result) {
    if(err) throw err;
    var accessToken = result[0].accessToken;
    var clientId = result[0].client_id;
    var options = {
      url: 'https://api.twitch.tv/helix/'+url,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer '+accessToken,
        'Client-Id': clientId
      }
  };

  await request(options, async function(error, response, body){
    if(response){
      var json = JSON.parse(body);
      if(json.status == "401"){
        await refreshAuth(db, function(status){
          if(status == '401'){
            return callback('401');
          } else {
            //redirect try again on call side
            return callback('300');
          }
        });
      } else {
        return callback(json);
      }
    } else {
      console.log(response)
      console.log(body)
      console.log(error)
      return callback('500');
      }
    });
  });
}


async function getSubStatus(url, accessToken, callback){
  var db = mongo.getDb();
  db.collection('config').find().toArray(async function (err, result) {
    if(err) throw err;
    var clientId = result[0].client_id;
    var options = {
      url: 'https://api.twitch.tv/helix/'+url,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer '+accessToken,
        'Client-Id': clientId
      }
  };

  await request(options, async function(error, response, body){
    if(response){
      var json = JSON.parse(body);
      if(json.status == "401"){
        await refreshAuth(db, function(status){
          if(status == '401'){
            return callback('401');
          } else {
            //redirect try again on call side
            return callback('300');
          }
        });
      } else {
        return callback(json);
      }
    } else {
      console.log(response)
      console.log(body)
      console.log(error)
      return callback('500');
      }
    });
  });
}




//shoulnd't need this
function postRequest(url){
  return 'not implemented';
}



//called if authorization fails for api related info
function refreshAuth(DB, callback){
  DB.collection('config').find().toArray(async function (err, result) {
    if(err) throw err;
    var refreshToken = result[0].refreshToken;
    var clientId = result[0].client_id;
    var clientSecret = result[0].client_secret;
    var options = {
      url: 'https://id.twitch.tv/oauth2/token?grant_type=refresh_token&refresh_token='+refreshToken+'&client_id='+clientId+'&client_secret='+clientSecret,
      method: 'POST'
  };

  await request(options, async function(error, response, body){
    if(response){
      var json = JSON.parse(body);
      if(json.status == '400' || json.status == '401'){
        return callback('401');
      } else {
        //store codes
        var accToken = json.access_token;
        var refToken = json.refresh_token;

        DB.collection("config").updateOne(
         { "_id" : ObjectID("")},
         {$set: {
             "accessToken": accToken,
             "refreshToken": refToken
           }});
        return callback('200');
      }
    } else {
      console.log(response)
      console.log(body)
      console.log(error)
      return callback('500');
      }
    });
  });
}
