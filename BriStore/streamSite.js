
const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const app = express();
var path = require('path');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var passport = require('passport');
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
const https = require('https');
const fs = require('fs');
var request = require('request');
const EventEmitter = require('events');
const cors = require('cors');



var mongo = require('./mongoUtil');
var ObjectID = require('mongodb').ObjectID;
var services = require('./serviceHandler');
var store = require('./storeHandler');
const paypal = require('paypal-rest-sdk');


var API = require('./twitchApi.js');

var CLIENT_ID, SECRET, SESSION_SECRET, BOT_AUTH, CALLBACK_URL;


//called from root main
//sends mongo client to get information as needed
async function startup(){
  mongo.connectToServer((db)=>{
    setupServices(db);
  });
}


function setupServices(db){
  db.collection("config").find().toArray(async function(err, result) {
    if (err) throw err;
    await handleStartup(result);
  });

  store.init(db);
  services.init(db);
  };

async function handleStartup(res) {
  CLIENT_ID = await res[0].client_id;
  SECRET = await res[0].client_secret;
  SESSION_SECRET = await res[0].session_secret;
  BOT_AUTH = await res[0].bot_auth;
  CALLBACK_URL = await res[0].callback_url;
  adminUsers = await res[0].adminUsers;
  modUsers = await res[0].modUsers;
  app.emit('ready');
};


//initialize app
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', true);
app.use(cookieParser());
app.use(session({
  secret: '',
  resave: true,
  saveUninitialized: true,
  cookie: { sameSite: "strict",  maxAge: (1000*60*60*24) } //24 hours
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(cors());
app.use(function(req, res, next) {
   res.header("Access-Control-Allow-Origin", "*");
   res.header('Access-Control-Allow-Methods', 'DELETE, PUT');
   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
   if ('OPTIONS' == req.method) {
      res.sendStatus(200);
    }
    else {
      next();
    }});


app.listen(3333);

app.on('ready', async function(){

});

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});



async function checkSub(userId, accessToken, callback){
  var result = await API.getSubStatus('subscriptions/user?broadcaster_id=773910538&user_id='+userId, accessToken, function(res){
    if(res.status === 404){
      callback(false);
    } else {
      var tier = res.data[0].tier;
      if(tier){
        callback(true);
      } else {
        callback(false);
      }
    }
  });
}

async function checkFollows(userId, accessToken, callback){
  var result = await API.getSubStatus('users/follows?to_id=773910538&from_id='+userId, accessToken, function(res){
    var data = res.data;
    if(data.length > 0){
      callback(true);
    } else {
      callback(false);
    }
  });
}

//twitch routes
app.get('/auth/stream', passport.authenticate('twitch', {scope: 'user:read:email user:read:subscriptions'}));
//redirect after oauth
require('https').globalAgent.options.rejectUnauthorized = false;
app.get('/auth/stream/callback', passport.authenticate('twitch', { successRedirect: '/', failureRedirect: '/failed' }));

app.get('/failed', function(req, res){
  res.send("Failed to get authorization");
});

//method to check authoritzation
function checkAuth(req){
    if(req.session && req.session.passport && req.session.passport.user){
    var username = req.session.passport.user.data[0].login;
    //test value
    if(username === 'raxa'){
      //return 'normalUser';
      return 'admin';
    }
    if(adminUsers.indexOf(username) > -1){
      //successful auth
      //console.log('found admin');
      return 'admin';
    } else if(modUsers.indexOf(username) > -1){
      return 'mod';
    } else if(username) {
      return 'normalUser';
    } else {
      return 'null'; //avoid spoofing things
    }
  }
  //console.log('found non-authorized in stream site');
  //console.log(username);
  return 'noAuth';
}



//endpoint to logout
app.get('/logout', function(req, res){
  req.logout();
  res.render('home');
})


//to main home page
app.get('/', function (req, res){
  //check for authenticated session
 var auth = checkAuth(req);
checkForCart(req.session)
  if(auth == 'admin'){
    var username = req.session.passport.user.data[0].login;
    //console.log('username found', username);
    var displayName = req.session.passport.user.data[0].display_name;
    var profile_image_url = req.session.passport.user.data[0].profile_image_url;
    //if logged in, send to home page
    res.render('home', { user: displayName, profile_image_url: profile_image_url});
  } else {
    //if no session is found disregard user info
    res.render('home');
  }
});

app.get('/401', function(req, res){
  res.render('401');
});

app.get('/art', function(req, res){
  checkForCart(req.session);
  res.render('art');
});



//endpoints and routes here
//pages
app.get('/commands', function(req, res){

});


app.get('/getCommands', function(req, res) {
  var db = mongo.getDb();
  db.collection("commands").find().toArray(function(err, result){
        if (err) throw err;
        var namesList = new Array();
        for (var i = 0; i < result.length; i++){
          namesList.push(result[i].name);
        }
        res.send(namesList);
      });
});




startup();

// separate out new store endpoints and pages below


//function to avoid issues with loading home and art pages with false notifications
function checkForCart(session){
  var checkCart = session.cart
  if(typeof checkCart === 'undefined' ){
    var cart = new Array();
    session.cart = cart;
    session.user = {};
    session.user.display_name = "guest";
    session.user.profile_image_url = "";
  } else {
    //ignore
  }
}


//utilize handlebars for cart functionality
//possibly with twitch login as well (optional?)
app.get('/merch', function(req, res){
  //console.log(req.session)
  var checkCart = req.session.cart;
  if(typeof checkCart === 'undefined' ){
    var cart = new Array();
    req.session.cart = cart;
    req.session.user = {};
    req.session.user.display_name = "guest";
    req.session.user.profile_image_url = "";
    res.render('merch', {cart: cart});
  } else {
    var displayName = req.session.user.display_name;
    var profile_image_url = req.session.user.profile_image_url;
    var cart = req.session.cart;
    //if logged in, send to home page with info
    res.render('merch', { user: displayName, profile_image_url: profile_image_url, cart: cart});
  }
});

app.get('/getMerchProducts',async function(req, res){
  await store.getProducts(function(result){
    res.send(result);
  });
});

app.get('/getCart', function(req, res){
  var cartCheck = req.session.cart;
  if(typeof cartCheck === 'undefined') {
    req.session.cart = new Array();
  }
  //calculate total while we're here and add to session
  var cart = req.session.cart;
  var currTotal = 0;
  for(var i = 0; i < cart.length; i++){
    var price = cart[i].price;
    var qty = cart[i].quantity;
    currTotal = currTotal + parseFloat(price) * qty;
  }
  req.session.cartSubTotal = currTotal;
  //console.log(req.session);
  res.send(req.session.cart);
});

//req body has product info
//expected info: variation id, name, price, size(if applicable otherwise size=NA), quantity
//add info to user cart array
//send back 200 code for front end update

app.post('/addToCart', function(req, res){
  var itemInfo = req.body;
  var cartCheck = req.session.cart;
  if(typeof cartCheck === 'undefined') {
    req.session.cart = new Array();
  }
  //spam prevention
  if(req.session.cart.length > 99){
    req.session.cart = new Array();
  } else{
    //check for matching item to increase qty instead
    //varid must match, other varids will have different size
    var idCheck = itemInfo.varId;
    var cart = req.session.cart;
  //  console.log(cart)
    var currId = '';
    var found = false;
    for (i in cart){
      currId = cart[i].varId;

      if(currId == idCheck){
        //increment qty
        found = true;
        req.session.cart[i].quantity = parseInt(req.session.cart[i].quantity) + 1;
      }
    }
    if(!found){
      itemInfo.quantity = parseInt(itemInfo.quantity);
      req.session.cart.push(itemInfo);
    }
  }
  res.send('200 OK');
});

app.post('/remFromCart', function(req, res){
  var itemInfo = req.body;
  var index = req.session.cart.findIndex(id => id.varId == itemInfo.varId);
  if(index == -1){
    res.send('404');//not found to remove
  } else {
    req.session.cart.splice(index, 1);//remove item from cart
    res.send('200 OK');
  }
});

app.post('/updateCart', function(req, res){
  var itemInfo = req.body;
  var index = req.session.cart.findIndex(id => id.varId == itemInfo.varId);
  if(index == -1){
    res.send('404');//not found to remove
  } else {
    var quantity = parseInt(itemInfo.quantity);
    req.session.cart[index].quantity = quantity;
    res.send('200 OK');
  }
});

//edit quantity functionality
//remove items function
//proceed to checkout function
app.get('/cart', function(req, res){
  var checkCart = req.session.cart;
  var checkUser = req.session.user;
  if(typeof checkCart === 'undefined' || typeof checkUser === 'undefined'){
    //if not a valid user session send to cart with empty cart
    var cart = new Array();
    req.session.cart = cart;
    req.session.user = {};
    req.session.user.display_name = "guest";
    req.session.user.profile_image_url = "";
    res.render('cart', {user: checkUser, cart: cart, stripePublicKey: '', status: null});
  } else {
    //if logged in, send to cart page with info and stripe public key
    res.render('cart', { user: checkUser, cart: checkCart, stripePublicKey: stripePublicKey, status: null});
  }
});



//function to get country info
app.get('/getCountries', async function(req, res){
  var options = {
    url: 'https://api.printful.com/countries',
    method: 'GET',
    headers: {
    }
  };
  await request(options, async function(error, response, body){
    if(response){
      res.send(body);
    }
  });
});



//calculate with printful api then attach to session and calculate cartFinalTotal
//https://api.printful.com/orders/estimate-costs
//{"recipient":{"address1":"123","city":"abc","country_code":"nz","state_code":"","zip":0},"items":[ {"variant_id":12917,"quantity":2}]}
app.post('/estimateCosts', async function(req, res){
  var form = req.body;
  //console.log(form)
  var checkCart = req.session.cart;
  var checkUser = req.session.user;
  if(typeof checkCart === 'undefined' || typeof checkUser === 'undefined'){
    //if not a valid user session send to cart with empty cart
    var cart = new Array();
    req.session.cart = cart;
    req.session.user = {};
    req.session.user.display_name = "guest";
    req.session.user.profile_image_url = "";
    res.render('cart', {user: checkUser, cart: cart, stripePublicKey: '', status: null});
    break;
  }


  var cart = req.session.cart;
  //console.log(cart)
  var items = new Array();
  for(var i = 0; i < cart.length; i ++){
    items.push({"variant_id": cart[i].shippingId, "quantity": cart[i].quantity});
  }
  var rObj = {
    "recipient":{"name":form.name, "email":form.email, "phone":form.phone,
    "address1":form.address, "city":form.city, "country_code":form.country_code,"state_code":form.state_code,"zip":form.zip}
    ,"items": items
  }
  req.session.shippingInfo = rObj;
  var options = {
        url: 'https://api.printful.com/orders/estimate-costs',
        method: 'POST',
        headers: {
          'Authorization': apiKey,
        },
        body: JSON.stringify(rObj)
    };

    await request(options, async function(error, response, body){
      if(response){
        //attach to session
        var data = JSON.parse(body);

        if(data.code == 400){
          res.sendStatus('400');
          return;
        }

        var shipping = data.result.costs.shipping;
        var tax = data.result.costs.tax;
        var vat = data.result.costs.vat;
        var itemsCost = req.session.cartSubTotal;
        var total = parseFloat(shipping + tax + vat + itemsCost);
        total = +total.toFixed(2);
        req.session.shipping = shipping;
        req.session.tax = tax;
        req.session.vat = vat;
        var resp = {
          code: 200,
          shipping: shipping,
          taxesTotal: tax + vat,
          fTotal: total
        }
        res.send(JSON.stringify(resp));
    }
  });
});


paypal.configure({
  'mode': 'live', //sandbox or live
  'client_id': '',
  'client_secret': ''
});

var paypalTransactions = [];
// possible bug with refreshing page causing cart.length to be undefined
app.post('/checkout', function(req, res){

  //create the items array
    var items = new Array();
    var cart = req.session.cart;
    var cost = 0;
    for (var i = 0; i < cart.length; i++){
            cost = cost + parseFloat(cart[i].price);
      var itemToAdd = {
        "name": cart[i].name,
        "sku": cart[i].varId,
        "price": cart[i].price,
        "quantity": parseInt(cart[i].quantity),
        "currency": "USD"
      };
      items.push(itemToAdd);
    }
    var formatter = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            });
    var subTotal = formatter.format(req.session.cartSubTotal);
    subTotal = subTotal.replace('$','');

    var shipping = req.session.shipping;
    var fees = parseFloat(req.session.tax) + parseFloat(req.session.vat);
    var finalTotal = parseFloat(shipping) + parseFloat(fees) + parseFloat(subTotal);
    finalTotal = formatter.format(finalTotal);
    finalTotal = finalTotal.replace('$','');
    const create_payment_json = {
      "intent": "sale",
      "payer": {
          "payment_method": "paypal"
      },
      "redirect_urls": {
          "return_url": "",
          "cancel_url": ""
      },
      "transactions": [{
          "item_list": {
              "items": items
          },
          "amount": {
              "currency": "USD",
              "details": {
                "shipping": shipping.toString(),
                "tax":fees.toString(),
                "subtotal": subTotal
              },
              "total": finalTotal
          },
          "description": "Brick Merch Order"
      }]
    };

    //remove cart here since no longer needed?
    //may cause an issue where someone loses their cart if they backout of paypal
    req.session.cart = new Array();

    paypal.payment.create(create_payment_json, function (error, payment) {
    if (error) {
      console.log(error.response);
        throw error;
    } else {
      paypalTransactions.push({id: payment.id, customer: req.session.shippingInfo, amount: payment.transactions[0].amount, items: payment.transactions[0].item_list.items})
      for(let i = 0;i < payment.links.length;i++){
        if(payment.links[i].rel === 'approval_url'){
          res.redirect(payment.links[i].href);
        }
      }
    }
    });
});

//payment approved from above approval_url
//customer returned here to execute the paypal transaction
//cancelled payments go back to cart
//session does not persist on this page for some reason

app.get('/cart/paymentSuccess', (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;
  var item = paypalTransactions.filter(obj =>{
    return obj.id == paymentId;
  })[0];

  var amount = item.amount.total;
  const execute_payment_json = {
    "payer_id": payerId,
    "transactions": [{
        "amount": {
            "currency": "USD",
            "total": amount
        }
    }]
  };

  //send execution of payment
  //deal with order to printful here
  paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    if (error) {
        console.log(error.response);
        res.redirect('/cart');
    } else {
      var checkId = payment.id;
      var index = paypalTransactions.findIndex(obj => obj.id == checkId);
      if(index == -1){
        console.log('unable to find id to remove:' + checkId)
        console.log(paypalTransactions);
      } else {
        //handle in store handler
        store.sendToPrintful(paypalTransactions[index], function(status){
          if(status == '200 OK'){
            paypalTransactions.splice(index, 1);//remove item from transactions
            res.redirect('/thankyou');
          } else if (status == '500') {
            res.redirect('/cart');
          }
        });
      }
    }
  });
});

app.get('/cart/paymentCancelled', (req, res) => res.redirect('/cart'));

app.get('/thankyou', function(req, res){
  res.render('paymentSuccess');
});



//printful webhook endpoint
//use to send info as needed
//order created event should line up with purchases on the site, however we may not need this if we handle payments anyway
/*
"types": ["package_returned","order_created","order_updated",
  "order_canceled","order_failed","product_synced",
  "product_updated","product_deleted","order_put_hold",
  "order_remove_hold"]
  TODO figure out stockupdated if we need it - needs IDs of products to monitor
  run get products api call on the stock and product changes
*/
app.post('/store/webhook', function(req, res){
  var body = req.body;

  var type = body.type;
  switch (type) {
    case 'package_shipped':
      store.handlePackageShip(body.data);
      break;
    case 'package_returned':
      store.handlePackageReturn(body.data);
      break;
    case 'order_created'://may not need this or use this to replace sending the email on printful order submit
      store.handleNewOrder(body.data);
      break;
    case 'order_failed':
      store.handleFailedOrder(body.data);
      break;
    case 'order_canceled':
      store.handleCanceledOrder(body.data);
      break;
    case 'order_updated':
      store.handleUpdatedOrder(body.data);
      break;
    case 'order_refunded':
      store.handleRefundedOrder(body.data);
      break;
    case 'order_put_hold':
      store.handlePutHoldOrder(body.data);
      break;
    case 'order_remove_hold':
      store.handleRemHoldOrder(body.data);
      break;
    case 'product_synced':
      store.handleProductChange(body.data);
      break;
    case 'product_updated':
      store.handleProductChange(body.data);
      break;
    case 'product_deleted':
      store.handleProductChange(body.data);
      break;
    default:
      console.log('unknown body found in store webhook')
      console.log(body)
      break;
  }

  res.sendStatus(200);
});
