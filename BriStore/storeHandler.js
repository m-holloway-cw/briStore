/*
File to hold all functions for store transactions including sending to overlay
*/
var mongo = require('./mongoUtil');
var ObjectID = require('mongodb').ObjectID;
var request = require('request');
var mail = require('./mail.js');

module.exports.init = init;
module.exports.getProducts = getProducts;
module.exports.sendToPrintful = sendToPrintful;
module.exports.handlePackageShip = handlePackageShip;
module.exports.handlePackageReturn = handlePackageReturn;
module.exports.handleNewOrder = handleNewOrder;
module.exports.handleFailedOrder = handleFailedOrder;
module.exports.handleUpdatedOrder = handleUpdatedOrder;
module.exports.handleCanceledOrder = handleCanceledOrder;
module.exports.handlePutHoldOrder = handlePutHoldOrder;
module.exports.handleRemHoldOrder = handleRemHoldOrder;
module.exports.handleProductChange = handleProductChange;
module.exports.handleRefundedOrder = handleRefundedOrder
//initialize the data from the api pull with printful
function init(){
  updateStoreDB();
};

//make api call to get list of available prodcuts from printful
async function updateStoreDB(){
  var DB = mongo.getDb();
  await DB.collection("store").find().toArray(async function(err, result) {
    if(err) throw err;
    var apiToken = result[0].token;
    var options = {
      url: 'https://api.printful.com/store/products',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer '+apiToken
      }
  };

  await request(options, async function(error, response, body){
    if(response){
      //console.log(response)
      //console.log('print in get req body');
      //console.log(body)
      var json = JSON.parse(body);
      var prodArray = json.result;
      var prodObj = new Object;
      for(var i = 0; i < prodArray.length; i++){
        var id = prodArray[i].id;
        var name = prodArray[i].name;
        var image = prodArray[i].thumbnail_url
        //send to other function to add to db as nested objects by id's
        //format: {productid, name, imageURL, variantArray[variantID, name, price, sku, size]}
        await getVariants(id, name, image, apiToken);
      }
    } else {
      console.log(response)
      console.log(body)
      console.log(error)
      }
    });
  });
};

async function getVariants(id, productName, productImage, apiToken,  callback){
  var options = {
    url: 'https://api.printful.com/store/products/'+id,
    method: 'GET',
    headers: {
      'Authorization': 'Bearer '+apiToken
    }
};

await request(options, async function(error, response, body){
  if(response){
  var DB = mongo.getDb();
    //console.log(body)
    var json = JSON.parse(body);
    var varArray = json.result.sync_variants;
    //console.log(varArray)
    var variants = new Array();
    for(var i = 0; i < varArray.length; i++){
      var varId = varArray[i].id;
      var name = varArray[i].name;
      var price = varArray[i].retail_price;
      var sku = varArray[i].sku;
      var shippingId = varArray[i].variant_id;
      var size = sku.substring(sku.indexOf("_")+1);
      var varObj = {varId: varId, name: name, price: price, sku: sku, size: size};
      variants.push(varObj);
      var prodObj = {id: id, shippingId: shippingId, name: productName, image: productImage, variants: variants};
      DB.collection('store').updateOne({
           "_id" : ObjectID(""), "products.id": {$ne: id}},
          {$push: {
            "products": prodObj
          }
        });

    }

  } else {
    console.log(response)
    console.log(body)
    console.log(error)
    }
  });
}


//get from DB 'store' collection
async function getProducts(callback){
  var DB = mongo.getDb();
  await DB.collection("store").find().toArray(async function(err, result) {
    if(err) throw err;
    var products = result[0].products;
    //console.log(products);
    callback(products)
  });
};


//todo consider using mongo for finalization functions
//i.e. after submitting cost calcuations or after order
//store using the paypalTransactions array
//printful needs:
/*recipient object : {
  name
  address
  city
  state_code
  country_code
  zip
  email
}
items object : {
sync_variant_id: int
quantity: int
}

*/
//send to overlay on success
async function sendToPrintful(transaction, callback){

  var DB = mongo.getDb();
  await DB.collection("store").find().toArray(async function(err, result) {
    var nextID = parseInt(result[0].orderID) + 1;
    var printfulOrderID = nextID.toString();

    DB.collection("store").updateOne(
      {"_id": ObjectID("")},
      {$inc: {
        orderID: 1
      }});

    var transactionItems = transaction.items;
    var printfulItemsArray = new Array();
    for(var i = 0; i < transactionItems.length; i++){
      var itemObject = {
        "sync_variant_id": parseInt(transactionItems[i].sku),
        "quantity": transactionItems[i].quantity
      };
      printfulItemsArray.push(itemObject);
    }

    var printfulOrderObj = {
      "external_id": printfulOrderID,
      "recipient": transaction.customer.recipient,
      "items": printfulItemsArray,
      "packing_slip": {
        "email": "",
        "message": "Thank you for being a brick!"
      }
    }

    var options = {
          url: 'https://api.printful.com/orders?confirm=true',
          method: 'POST',
          headers: {
            'Authorization': 'Bearer'
          },
          body: JSON.stringify(printfulOrderObj)
      };

      await request(options, async function(error, response, body){
        if(response){
          var json = JSON.parse(body);
          var printfulResult = json.result;
          console.log('order recieved and sent to printful');
          //add to db
          var DB = mongo.getDb();
          await DB.collection("store").find().toArray(function(err, result){
            if(err) console.log(err);
            var ordersArray = result[0].orders;
            var externalID = printfulResult.external_id;
            var printfulOrderID = printfulResult.id;
            var email = printfulResult.recipient.email;
            var printfulItems = printfulResult.items;
            ordersArray[externalID] = {
              printfulOrderID: printfulOrderID,
              email: email,
              items: printfulItems
            };
              //console.log(entrantArray)
              DB.collection("store").updateOne(
                {"_id": ObjectID("")},
                {$set: {
                  orders: ordersArray
                }});
            });

          var alert = {};
          sendToOverlay(alert);
          callback('200 OK');
          } else {
          callback('500');
        }
      });
    });
  };

async function sendToOverlay(alert){
  //send to chat first
  //for now as well until overlay
  var msgObj = {"message": 'Someone just ordered from the store! Thank you for ordering! briciuLove'};
  var options = {
        url: 'https://bot.briciusss.com/api/chat',
        method: 'POST',
        headers: {
          'token': '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(msgObj)
    };

    await request(options, async function(error, response, body){
    });
  }



//mail stuff here
async function handlePackageShip(data){
  var shipment = data.shipment;
  var order = data.order;//printful thing idk how or why order.order works on api sim but not production
  if(typeof order.recipient == 'undefined'){
    order = data.order.order;
  }
  console.log(order);
  var recipient = order.recipient;

  var items = order.items;

  var subject = "Brick Merch Order Shipped!"
  var trackingNum = shipment.tracking_number;
  var trackingURL = shipment.tracking_url;
  var carrier = shipment.carrier;

  var info = {
    email: recipient.email,
    subject: subject,
    orderNum: order.external_id,
    trackingNum: trackingNum,
    trackingURL: trackingURL,
    carrier: carrier,
    items: items
  };
  mail.sendPackageShip(info, function(status){
    console.log('shipped order status code: ' + status);
  });
}


function handleNewOrder(data){
  var order = data.order;//printful thing idk.

  var recipient = order.recipient;
  var items = order.items;
  var subject = "Brick Merch Order Received!"

  var info = {
    email: recipient.email,
    subject: subject,
    orderNum: order.external_id,
    trackingNum: 0,
    trackingURL: 'N/A',
    carrier: 'N/A',
    items: items
  };
  mail.sendPackageShip(info, function(status){
    console.log('new order created status code: ' + status);
  });
}

//probably don't need this as everything else is covered below or above
function handleUpdatedOrder(data){
  console.log('Order updated notification');
  console.log(data);
}



//support stuff below here
//send email to support
function handlePackageReturn(data){
  var reason = data.reason;
  var shipment = data.shipment;
  var order = data.order.order;//printful api issue with order.order layers

  var recipient = order.recipient;
  var items = order.items;
  var trackingNum = shipment.tracking_number;
  var trackingURL = shipment.tracking_url;

  var info = {
    subject: "Brick Merch Package Returned",
    reason: data.reason,
    orderNum: order.external_id,
    trackingNum: trackingNum,
    trackingURL: trackingURL,
    recipEmail: recipient.email,
    items: items
  };
  mail.sendSupportEmail(info, function(status){
    console.log('packaged returned mail status code: ' + status)
  });
}



//send email to support
function handleFailedOrder(data){
  var reason = data.reason;
  var order = data.order.order;//printful api issue with order.order layers.

  var recipient = order.recipient;
  var items = order.items;

  var info = {
    subject: "Brick Merch Order Failed",
    reason: data.reason,
    orderNum: order.external_id,
    trackingNum: 0,
    trackingURL: "N/A",
    recipEmail: recipient.email,
    items: items
  };
  mail.sendSupportEmail(info, function(status){
    console.log('failed order mail status code: ' + status)
  });
}

//send email to support
function handleRefundedOrder(data){
  var reason = data.reason;
  var order = data.order.order;//printful api issue with order.order layers.

  var recipient = order.recipient;
  var items = order.items;

  var info = {
    subject: "Brick Merch Order Refunded",
    reason: data.reason,
    orderNum: order.external_id,
    trackingNum: 0,
    trackingURL: "N/A",
    recipEmail: recipient.email,
    items: items
  };
  mail.sendSupportEmail(info, function(status){
    console.log('canceled order mail status code: ' + status)
  });
}


//send email to support
function handleCanceledOrder(data){
  var reason = data.reason;
  var order = data.order.order;//printful api issue with order.order layers.

  var recipient = order.recipient;
  var items = order.items;

  var info = {
    subject: "Brick Merch Order Canceled",
    reason: data.reason,
    orderNum: order.external_id,
    trackingNum: 0,
    trackingURL: "N/A",
    recipEmail: recipient.email,
    items: items
  };
  mail.sendSupportEmail(info, function(status){
    console.log('canceled order mail status code: ' + status)
  });
}

//send email to support
function handlePutHoldOrder(data){
  var reason = data.reason;
  var order = data.order.order;//printful api issue with order.order layers.

  var recipient = order.recipient;
  var items = order.items;

  var info = {
    subject: "Brick Merch Order Put On Hold",
    reason: data.reason,
    orderNum: order.external_id,
    trackingNum: 0,
    trackingURL: "N/A",
    recipEmail: recipient.email,
    items: items
  };
  mail.sendSupportEmail(info, function(status){
    console.log('put hold on order mail status code: ' + status)
  });
}

//send email to support
function handleRemHoldOrder(data){
  var reason = data.reason;
  var order = data.order.order;//printful api issue with order.order layers.

  var recipient = order.recipient;
  var items = order.items;

  var info = {
    subject: "Brick Merch Order Hold Removed",
    reason: data.reason,
    orderNum: order.external_id,
    trackingNum: 0,
    trackingURL: "N/A",
    recipEmail: recipient.email,
    items: items
  };
  mail.sendSupportEmail(info, function(status){
    console.log('remove hold on order mail status code: ' + status)
  });
}

//reload product database
function handleProductChange(data){
  console.log('Refreshing product database due to change');
  updateStoreDB();
}
