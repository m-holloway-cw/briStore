module.exports.sendPackageShip = sendPackageShip;
module.exports.sendSupportEmail = sendSupportEmail;

const mailGun = require('mailgun-js');



async function sendPackageShip(info, callback){
  var email = info.email;
  var subject = info.subject;
  var orderNum = info.orderNum;
  var trackingNum = info.trackingNum;
  var trackingURL = info.trackingURL;
  var carrier = info.carrier;
  var items = info.items;
  var itemTxt = '';
  for(var i = 0; i < items.length; i++){
    if(i==0){
      itemTxt = items[i].name;
    } else if(i == items.length-1 && items.length > 0){
      itemTxt =  itemTxt + ', and ' + items[i].name;
    } else {
      itemTxt =  itemTxt + ', ' + items[i].name;
    }
  }
  var text = '';
  if(info.trackingNum != 0 ){
    text =  'Thank you for your support, it means so much! <br>Your order of ' + itemTxt + ' has an order number of: #' + orderNum + ' and tracking number of: <br><a href="trackingURL">' + trackingNum + '</a> with ' + carrier + ' <br>I appreciate you being such a great part of the brick community! <br><img src="https://briciusss.com/img/BriciuLove100.png"><br>- Briciusss';
  } else {
    text =  'Thank you for your support, it means so much! <br>Your order of ' + itemTxt + ' has an order number of: #' + orderNum + ' Tracking information will be sent when ready! <br>I appreciate you being such a great part of the brick community! <br><img src="https://briciusss.com/img/BriciuLove100.png"><br>- Briciusss';
  }

 try{
   const domain = '';
   const mg = mailGun({apiKey: '', domain: domain});
   const data = {
	from: '',
	to: email,
	subject: subject,
  //alt for nonhtml email just in case
  text: text,
	html: '<html><head></head>'+
  '<body style="font-size: 30px; text-align: center;"><img style="margin-bottom: 20px;" src="https://briciusss.com/img/BriciusssEmailBanner.png">'+
'<div style=""><img style="" src="https://briciusss.com/img/BriciuHi100.png"> <h3 style="margin-top: -10px;">Order info</h3><p style="width: 800px; text-align: center; margin: auto;">'+text+
'</p></div></body><footer style="width: 800px; text-align: center; margin: auto; background-color: #FF3CAC; background-image: linear-gradient(45deg, #FF3CAC 0%, #784BA0 50%, #00ffcc 100%);"><section><div><a href="https://www.twitch.tv/briciusss"> <img class="icon" src="https://briciusss.com/img/twitch-icon.png" width="auto" height="100" alt="Twitch Icon"></a><a href="https://www.youtube.com/channel/UCmpGpWC-enaHg3diu98w27A"> <img class="icon" src="https://briciusss.com/img/youtube-icon.png" width="auto" height="100" alt="YouTube Icon"></a><a href="https://discord.gg/HsXTV3N8Td"> <img class="icon" src="https://briciusss.com/img/discord-icon.png" width="auto" height="100" alt="Discord Icon"></a><a href="https://www.tiktok.com/@briciusss"> <img class="icon" src="https://briciusss.com/img/tiktok-icon.png" width="auto" height="100" alt="Tiktok Icon"></a><a href="https://twitter.com/briciusss"> <img class="icon" src="https://briciusss.com/img/twitter-logo.png" width="auto" height="100" alt="Twitter Icon"></a><a href="https://www.instagram.com/briciusss_/"> <img class="icon" src="https://briciusss.com/img/instagram-logo.png" width="auto" height="100" alt="Instagram Icon"></a></div></section></footer></html>'
};
   mg.messages().send(data, function(err, body) {
	if(err) throw err;
	});
 } catch(e) {
	console.log(e);
	callback("500");
 }
	callback("200 OK");
}


async function sendSupportEmail(info, callback){
  var email = '';
  var subject = info.subject;
  var orderNum = info.orderNum;
  var recipEmail = info.recipEmail;
  var trackingNum = info.trackingNum;
  var trackingURL = info.trackingURL;
  var items = info.items;
  var itemTxt = '';
  for(var i = 0; i < items.length; i++){
    itemTxt = itemTxt + ' || ' + items[i].name + '['+items[i].quantity+']';
  }
  var text = subject+ '  for internal order id: ' + orderNum + '<br>Recipient Email: ' + recipEmail + '<br>Tracking number: '+ trackingNum + ' url: '+ trackingURL +
  '<br>Items involved: ' + itemTxt;


 try{
   const domain = 'mail.briciusss.com';
   const mg = mailGun({apiKey: '', domain: domain});
   const data = {
	from: '',
	to: email,
	subject: subject,
  //alt for nonhtml email just in case
  text: text,
	html: '<html><head></head>'+
  '<body style="font-size: 30px; text-align: center;"><img style="margin-bottom: 20px;" src="https://briciusss.com/img/BriciusssEmailBanner.png">'+
'<div style=""><img style="" src="https://briciusss.com/img/BriciuHi100.png"> <h3 style="margin-top: -10px;">Merch Support Email</h3><p style="width: 800px; text-align: center; margin: auto;">'+text+
'</p></div></body></html>'
};
   mg.messages().send(data, function(err, body) {
	if(err) throw err;
	});
 } catch(e) {
	console.log(e);
	callback("500");
 }
	callback("200 OK");
}
