var globalProductArray = new Array();

function getProducts(){
  $.ajax({
    url: '/getMerchProducts',
    type: 'get',
    success:function(data){
    //  console.log(data)
      //make accessible for later use
      globalProductArray = data;

      //create a product display for each item
      //each item may or may not have variants (sizes)
      //hats, beanie, emote sticker
      //if variant array size === 1 assume it does not have size options
      //else use the size attribute in the variant object
      //assign the button.id = variantId
      //then do something like this buyButton.onclick = function(){ addToCart(this.id) };
      //see products.js in hcw for template
      for (var i = 0; i < data.length; i++){
        var itemID = data[i].id;
        var name = data[i].name;
        var itemImageURL = data[i].image;

        var container = document.getElementById('products-container');
        var item = document.createElement('div');
        item.className = 'item';
        var thumb = document.createElement('div');
        thumb.className = 'thumbnail-product';
        var imgBtn = document.createElement('input');
        imgBtn.type="image";
        imgBtn.src=itemImageURL;
        imgBtn.className="productMenuImage";
        imgBtn.id = itemID
        imgBtn.setAttribute("onclick","handleTopicClick(this.id)");

        var title = document.createElement('h2');
        title.innerHTML = name;
	      title.style.height = '100px';
        title.style.marginBottom = '-5px';

        thumb.appendChild(imgBtn);
        item.appendChild(title);
        item.appendChild(thumb);
        container.appendChild(item);
      }
      var placeholder = document.createElement('div');
      placeholder.className = 'item';
      var thumb = document.createElement('div');
      thumb.className = 'thumnail-product';
      var img = document.createElement('img');
      img.src = '/img/fallEmote.png';
      img.className = 'productMenuImage';
      var desc = document.createElement('h2');
      desc.innerHTML = 'Limited Fall Collection Coming Soon!';
      desc.style.height = '100px';
      desc.style.marginBottom = '-5px';

      thumb.appendChild(img);
      placeholder.appendChild(desc);
      placeholder.appendChild(thumb);
      document.getElementById('products-container').appendChild(placeholder);

    },
    error: function(XMLHttpRequest, textStatus, errorThrown) {
      //  alert("Error occurred in getting merch products from server");
      console.log('error occurred in getting merch products')
      }
  });
};


$(document).ready(function(){
  getProducts();
});

function handleTopicClick(varId){
  document.getElementById("products-container").style.display = "none";//hide our main display
  var item = globalProductArray.filter(obj =>{
    return obj.id == varId;
  })[0];

  var backWrapper = document.createElement('div');
  backWrapper.setAttribute('id', 'backWrapper');

  //back button to get back to all products
  var btn = document.createElement('button');
  btn.setAttribute("onclick", "returnToAll()");
  btn.setAttribute("id", "backButton");
  btn.innerHTML = "Back";
  btn.className = "btn";

  var productImage = document.createElement('img');
  productImage.setAttribute("src", item.image);
  productImage.className = "productMenuImage";

  backWrapper.appendChild(btn);
  backWrapper.appendChild(productImage);


  var form = document.createElement("form");
  form.setAttribute("method", "post");
  form.setAttribute("id", "productForm");


  //split design if variants = 1 (i.e. no size options)
  var variants = item.variants;
  if(variants.length > 1){ //show size options
    var label = document.createElement("label");
    label.setAttribute("for", "sizes");
    label.innerHTML = "Size:  "

    var select = document.createElement("select");
    select.setAttribute("onchange", "getPrice()");
    select.setAttribute("name", "sizes");
    select.setAttribute("id", "sizes");


    for (v in variants){
      var option = document.createElement("option");
      option.setAttribute("name", variants[v].size);
      option.setAttribute("price", variants[v].price);
      option.setAttribute("value", variants[v].varId);
      option.innerHTML = variants[v].size;
      select.appendChild(option);
    }
    form.appendChild(label);
    form.appendChild(select);
  } else {
    var variantId = variants[0].varId;
    var hidden = document.createElement("input");
    hidden.setAttribute("type", "hidden");
    hidden.setAttribute("value", variantId);
    hidden.setAttribute("id", "hiddenId");
    form.appendChild(hidden);
  }

  var title = document.createElement('h2');
  title.innerHTML = item.name;

  var price = document.createElement('h3');
  price.innerHTML = '$'+item.variants[0].price; //default to first item
  price.setAttribute('id', 'price');

  var addToCart = document.createElement('button');
  addToCart.setAttribute("onclick", "addToCart(this)");
  addToCart.setAttribute("id", "addToCart");
  addToCart.innerHTML = "Add To Cart";
  addToCart.className = "btn";

  var addMessage = document.createElement('p');
  addMessage.innerHTML = '';
  addMessage.setAttribute('id', 'addMessage');

  var wrapper = document.getElementById("productWrapper");
  wrapper.innerHTML = '';
//  wrapper.appendChild(btn);
//  wrapper.appendChild(productImage);
  wrapper.appendChild(backWrapper);
  var formWrapper = document.createElement('div');
  formWrapper.setAttribute('id','formWrapper');

  formWrapper.appendChild(title);
  formWrapper.appendChild(form);
  formWrapper.appendChild(price);
  formWrapper.appendChild(addToCart);
  formWrapper.appendChild(addMessage);

  wrapper.appendChild(formWrapper);

  wrapper.style.display = "flex";


  //scroll to top of page
  window.scrollTo(0,0);
}

function returnToAll(){
  document.getElementById("products-container").style.display = "grid";//show our main display
  document.getElementById("productWrapper").style.display = "none";//hide our main display
}

function getPrice(){
  var price = document.getElementById('price');
  price.innerHTML = '$'+($("#sizes").find(':selected').attr('price'));
}

function addToCart(element){
    //this will be undefined if single variant
  var varId = $("#sizes").find(':selected').attr('value');
  if(typeof(varId) == 'undefined'){
    //grab variant id and send to backend
    varId = $("#hiddenId").attr('value');
    //console.log(varId);
    var item = globalProductArray.filter(obj =>{
      //console.log(obj)
      return obj.variants[0].varId == varId;
    })[0];
    //console.log(item)
    var itemObj = {
      varId: varId,
      shippingId: item.shippingId,
      name: item.name,
      image: item.image,
      price: item.variants[0].price,
      size: 'NA', //flag for single variant item, i.e. hat
      quantity: 1
    }
    //console.log(itemObj)
    $.ajax({
      url: '/addToCart',
      type: 'post',
      data: itemObj,
      success:function(data){
        if(data === "200 OK"){
          //console.log('cart: ' + data)
          refreshCart();
          document.getElementById('addMessage').innerHTML = "Added item to cart!";
        } else {
          console.log('error in adding to cart');
          //document.getElementById("submitStatus").innerHTML = "Error occurred restarting repeats";
        }
      },
      error: function(XMLHttpRequest, textStatus, errorThrown) {
        //alert("Error occurred in restart request");
        window.location.reload();
      }
    });
  } else {
    //send to backend
    //console.log(varId);
    var item = {};
    for(var i = 0; i < globalProductArray.length; i++){
      var currArr = globalProductArray[i].variants;
      //console.log(currArr)
      for (var j = 0; j < currArr.length; j++){
        //console.log(currArr[j])
        if(currArr[j].varId == varId){
          //console.log(globalProductArray[i])
          item = currArr[j];
          item.image = globalProductArray[i].image;
          item.shippingId = globalProductArray[i].shippingId;
        }
      }
    }

    //console.log(item)
    var itemObj = {
      varId: varId,
      name: item.name,
      shippingId: item.shippingId,
      image: item.image,
      price: item.price,
      size: item.size, //flag for single variant item, i.e. hat
      quantity: 1
    }
    //console.log(itemObj)
    $.ajax({
      url: '/addToCart',
      type: 'post',
      data: itemObj,
      success:function(data){
        if(data === "200 OK"){
          //console.log('cart: ' + data)
          refreshCart();
          //document.getElementById("submitStatus").innerHTML = "Repeating commands restarted";
        } else {
          console.log('error in adding to cart');
          //document.getElementById("submitStatus").innerHTML = "Error occurred restarting repeats";
        }
      },
      error: function(XMLHttpRequest, textStatus, errorThrown) {
        //alert("Error occurred ");
        window.location.reload();
      }
    });
  }

  //variation id has all the attributes needed
  //todo figure out the id side of adding to customer cart with displays in mind
}

function refreshCart(){
  $.ajax({
    url: '/getCart',
    type: 'get',
    success:function(data){
      var notifs = 0;
      for (var i = 0; i < data.length; i++){
        var qty = data[i].quantity;
        notifs = notifs + qty;
      }
      //console.log(notifs)
      if(notifs == 0){
        document.getElementById('cartNotif').style.display = "none";
      } else {
      //  console.log('setting to block')
        //console.log(document.getElementById('cartNotif'));
        document.getElementById('cartNotif').style.display = 'block';
        document.getElementById('cartNotif').innerHTML = notifs;
      }

    },
    error: function(XMLHttpRequest, textStatus, errorThrown) {
      //  alert("Error occurred in getting merch products from server");
      console.log('error occurred in getting merch products')
      window.location.reload();
      }
  });
}

/*
var addCart = document.createElement('div');
var price = document.createElement('div');
price.className = 'price';
price.innerHTML = '$'+itemPrice;
var buyButton = document.createElement('a');
buyButton.className = 'btn buyBtn';
buyButton.role='button';
buyButton.innerHTML = 'Add To Cart';
var sku = hG[i].sku;
buyButton.id = sku;
buyButton.onclick = function(){ addHGToCart(this.id) };
addCart.appendChild(price);
addCart.appendChild(buyButton);
*/

/*POST example
$.ajax({
  url: '/restartRepeats',
  type: 'post',
  data: $('#delForm').serialize(),
  success:function(data){
    if(data === "200 OK"){
      document.getElementById("submitStatus").innerHTML = "Repeating commands restarted";
    } else {
      document.getElementById("submitStatus").innerHTML = "Error occurred restarting repeats";
    }
  },
  error: function(XMLHttpRequest, textStatus, errorThrown) {
    alert("Error occurred in restart request");
  }
})
on submit example for form
$('#commandForm').submit(function(){
  submitEditCommand();
  return false;
});
*/
