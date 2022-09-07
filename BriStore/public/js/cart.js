

$(document).ready(function(){
    getCart();
    getCountries();
});

function removeItem(itemID){
  var item = globalProductArray.filter(obj =>{
    return obj.varId == itemID;
  })[0];
  $.ajax({
    url: '/remFromCart',
    type: 'post',
    data: item,
    success:function(data){
      if(data == "200 OK"){
          refreshCart();
        } else {
        console.log('error in removing from cart');
      }
    },
    error: function(XMLHttpRequest, textStatus, errorThrown) {
      alert("Error occurred in removing from cart");
    }
  });
}


function lowerQuantity(itemID){
  var item = globalProductArray.filter(obj =>{
    return obj.varId == itemID;
  })[0];
  if(item.quantity == 1){
    //console.log('cannot lower from 1')
    return;
  }
  item.quantity = parseInt(item.quantity) - 1;
  $.ajax({
    url: '/updateCart',
    type: 'post',
    data: item,
    success:function(data){
      if(data === "200 OK"){
          refreshCart();
          //recalculate expenses if applicable
          var checkShipping = document.getElementById('shippingTotal').textContent;
          if(checkShipping != '--'){
            calcExpenses();
          }
        } else {
        console.log('error in decrese from cart');
      }
    },
    error: function(XMLHttpRequest, textStatus, errorThrown) {
      alert("Error occurred in decrease qty in cart");
    }
  });
}

function increaseQuantity(itemID){
  var item = globalProductArray.filter(obj =>{
    return obj.varId == itemID;
  })[0];
  item.quantity = parseInt(item.quantity) + 1;
  $.ajax({
    url: '/updateCart',
    type: 'post',
    data: item,
    success:function(data){
      if(data === "200 OK"){
          refreshCart();
          //recalculate expenses if applicable
          var checkShipping = document.getElementById('shippingTotal').textContent;
          if(checkShipping != '--'){
            calcExpenses();
          }
        } else {
        console.log('error in increasing qty in cart');
      }
    },
    error: function(XMLHttpRequest, textStatus, errorThrown) {
      alert("Error occurred in increasing from cart");
    }
  });
}


//first button press to begin checkout process
//open form for customer info and change button to calculate costs
function openInfoForm(){
  document.getElementById('formContainer').style.display = "block";
  document.getElementById('checkoutBtn').setAttribute('onclick','calcExpenses()');
  document.getElementById('checkoutBtn').innerHTML = "Calculate Costs";
}

//coming from open form
//sends form data to server
//gets back shipping, fees, and final total price based on printful api
//need to check validity and sanitize data here
//then change button to open checkout with paypal
function calcExpenses(){
  //check form data here
  if(!checkInfoForm()) {
    //console.log('missing or invalid item');
    return;
  }
  //remove error message
  document.getElementById('errorMsg').innerHTML = '';
  var formObj = Object.fromEntries(new FormData(document.getElementById('checkoutForm')).entries());
  //console.log(formObj)
  if(formObj.country == 'Select Country'){
    document.getElementById('errorMsg').innerHTML = 'Please select a country';
    return;
  }
  var countryCode = '';
  var state = '';
  var item = globalCountriesArray.filter(obj =>{
    //console.log(obj.name)
    //console.log(formObj.country)
    return obj.name == formObj.country;
  })[0];
  //console.log(item)
  countryCode = item.code;
  var checkStates = item.states;
  //console.log(checkStates);
  var state = '';
  if(checkStates == null){
    state = '';
  } else {
    var stateItem = item.states.filter(st => {
      return st.name == formObj.state;
    })[0];
    state = stateItem.code;
  }


  var sendObj = {
    name: formObj.name, email: formObj.email, phone: formObj.phone,
    address: formObj.address, city: formObj.city, country_code: countryCode, state_code: state, zip: formObj.zip
  }
//console.log(sendObj)
  //get estimate costs api call
  $.ajax({
    url: '/estimateCosts',
    type: 'post',
    data: sendObj,
    success:function(data){
      data = JSON.parse(data);
      if(data.code == 200){
        //console.log(data);
        //fill labels with data
        var formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        });
        document.getElementById('shippingTotal').innerHTML = formatter.format(data.shipping);
        document.getElementById('taxesTotal').innerHTML = formatter.format(data.taxesTotal);
        document.getElementById('fTotal').innerHTML = formatter.format(data.fTotal);
        //change button function
        var formElem = document.createElement('form');
        formElem.action = "/checkout";
        formElem.method = "post";
        formElem.id ="payForm";

        var input = document.createElement('input');
        input.type = "submit";
        input.value = "Pay With Paypal";
        input.className = 'btn';
        formElem.appendChild(input);
        if(document.getElementById('payForm')!=null){
          document.getElementById('payForm').remove();
        }
        document.getElementById("paypalButtonContainer").appendChild(formElem);
        document.getElementById('checkoutBtn').setAttribute('onclick','calcExpenses()');
        document.getElementById('checkoutBtn').innerHTML = "Recalculate Costs";
        } else {
        console.log('provided info error');
        document.getElementById('errorMsg').innerHTML = 'Information error, check zipcode and state and try again';
      }
    },
    error: function(XMLHttpRequest, textStatus, errorThrown) {
      //alert("Error occurred in purchase");
      document.getElementById('errorMsg').innerHTML = 'Information error, check zipcode and state and try again';
    }
  });
}



//function to return bool if items in form are okay
function checkInfoForm() {
  var isValid = true;
  var form = document.getElementById('checkoutForm');
  if(form.checkValidity()){
    return isValid;
  }
  var isName = form.elements["name"].checkValidity()
  if(!isName){
    document.getElementById('nameError').innerHTML ='<br>'+ form.elements["name"].validationMessage;
    isValid = false;
  } else if (isName) {
    document.getElementById('nameError').innerHTML = '';
  }
  var isEmail = form.elements["email"].checkValidity()
  if(!isEmail){
    document.getElementById('emailError').innerHTML ='<br>'+ form.elements["email"].validationMessage;
    isValid = false;
  } else if (isEmail) {
    document.getElementById('emailError').innerHTML = '';
  }
  var isAddress = form.elements["address"].checkValidity()
  if(!isAddress){
    document.getElementById('addressError').innerHTML = '<br>'+ form.elements["address"].validationMessage;
    isValid = false;
  }else if (isAddress) {
    document.getElementById('addressError').innerHTML = '';
  }
  var isCity = form.elements["city"].checkValidity();
  if(!isCity){
    document.getElementById('cityError').innerHTML = '<br>'+form.elements["city"].validationMessage;
    isValid = false;
  }else if (isCity) {
    document.getElementById('cityError').innerHTML = '';
  }

  return isValid;
}



//comes from cost estimator
//push notification to server to begin paypal transaction
//may double send form data to prevent spoofing
//customer is sent to paypal checkout from here
//upon successful payment, redirected to thank you page
function checkout(){
  if(!checkInfoForm()) {
    //console.log('missing or invalid item');
    return;
  }

  var formObj = Object.fromEntries(new FormData(document.getElementById('checkoutForm')).entries());
  var countryCode = '';
  var state = '';
  var item = globalCountriesArray.filter(obj =>{
    return obj.name == formObj.country;
  })[0];
  countryCode = item.code;
  var checkStates = item.states;
  var state = '';
  if(checkStates == null){
    state = '';
  } else {
    var stateItem = item.states.filter(st => {
      return st.name == formObj.state;
    })[0];
    state = stateItem.code;
  }


  var sendObj = {
    name: formObj.name, email: formObj.email, phone: formObj.phone,
    address: formObj.address, city: formObj.city, country_code: countryCode, state_code: state, zip: formObj.zip
  }


  $.ajax({
    url: '/checkout',
    type: 'post',
    crossDomain: true,
    data: sendObj,
    success:function(data){
      //no data should come through here
      if(data){
        console.log('provided info error');
        console.log(data); //error message
        //remove payform and force resubmitting cost calc
        if(document.getElementById('payForm')!=null){
          document.getElementById('payForm').remove();
        }
        document.getElementById('errorMsg').innerHTML = 'Data mismatch error, please hit recalculate costs';
      }},
    error: function(XMLHttpRequest, textStatus, errorThrown) {
      adocument.getElementById('errorMsg').innerHTML = 'Data mismatch error, please hit recalculate costs';
    }
  });
}

var globalCountriesArray = new Array();

//helper function to get country and state codes
function getCountries(){
  $.ajax({
    url: '/getCountries',
    type: 'get',
    success:function(data){
      var countries = JSON.parse(data);
      globalCountriesArray = countries.result;
      //each object has name, code, and states array
      if(countries.code == 200){
        var arr = countries.result;
        //sort by name
        arr.sort(function(a, b) {
          return (a.name > b.name) ? 1: -1
        });

        var countrySelect = document.createElement("select");
        countrySelect.setAttribute("onchange", "getStates()");
        countrySelect.setAttribute("name","country");
        countrySelect.setAttribute("id", "country");
        countrySelect.style.width = '149px';


        for(var i = 0; i < arr.length; i++){
          var name = arr[i].name;
          var code = arr[i].code;
          //ignore states until country is selected
          var option = document.createElement('option');
          option.setAttribute('name', name);
          option.setAttribute('code', code);
          option.innerHTML = name;
          if(code == 'US'){
            countrySelect.insertBefore(option, countrySelect.firstChild);
          } else {
            countrySelect.appendChild(option);
          }
        }
        var option = document.createElement('option');
        option.setAttribute('name', '');
        option.setAttribute('code', '');
        option.innerHTML = 'Select Country';
        option.setAttribute('selected', true);
        countrySelect.insertBefore(option, countrySelect.firstChild);

        var form = document.getElementById("checkoutForm");
        if(form != null){
          var label = document.createElement("label");
          label.setAttribute("for", "country");
          label.innerHTML = "   Country   ";
          var errorLabel = document.createElement('p');
          errorLabel.id= 'countryError';
          errorLabel.className = 'errorMsg';
          form.appendChild(countrySelect);
          form.appendChild(label);
          form.appendChild(errorLabel);
        }
      }
    }
  });
}

function getStates() {
  document.getElementById('errorMsg').innerHTML = '';
  var country = $("#country").find(':selected').attr('code');
  var item = globalCountriesArray.filter(obj =>{
    return obj.code == country;
  })[0];
  //console.log(item)
  if(typeof item == 'undefined'){ //fix for select a country item
    var states = null;
  } else {
    var states = item.states;
  }
 //will be null if not applicable
  if(states){ //create
    //remove old first
    if(document.getElementById('state') != null){
      document.getElementById('state').remove();
      document.getElementById('stateLabel').remove();
      document.getElementById('stateError').remove();
      document.getElementById('zip').remove();
      document.getElementById('zipLabel').remove();
      document.getElementById('zipError').remove();
    }

    var stateSelect = document.createElement("select");
    stateSelect.setAttribute("name","state");
    stateSelect.setAttribute("id", "state");
    stateSelect.style.width = '149px';

    for(var i = 0; i < states.length; i++){
      var name = states[i].name;
      var code = states[i].code;
      //ignore states until country is selected
      var option = document.createElement('option');
      option.setAttribute('name', name);
      option.setAttribute('code', code);
      option.innerHTML = name;
      stateSelect.appendChild(option);
    }

    var form = document.getElementById("checkoutForm");
    var label = document.createElement("label");
    label.setAttribute("for", "state");
    label.id = 'stateLabel';
    label.innerHTML = "   State/Province   ";
    var errorLabel = document.createElement('p');
    errorLabel.id= 'stateError';
    errorLabel.className = 'errorMsg';

    var zip = document.createElement('input');
    zip.type = 'text';
    zip.id = 'zip';
    zip.name = 'zip';
    var zipLabel = document.createElement("label");
    zipLabel.setAttribute("for", "zip");
    zipLabel.id = 'zipLabel';
    zipLabel.innerHTML = "   Zip Code   ";
    var zipErrorLabel = document.createElement('p');
    zipErrorLabel.id= 'zipError';
    zipErrorLabel.className = 'errorMsg';

    form.appendChild(stateSelect);
    form.appendChild(label);
    form.appendChild(errorLabel);
    form.appendChild(zip);
    form.appendChild(zipLabel);
    form.appendChild(zipErrorLabel);
  } else { //remove from form
    if(document.getElementById('state') != null){
      document.getElementById('state').remove();
      document.getElementById('stateLabel').remove();
      document.getElementById('stateError').remove();
      document.getElementById('zip').remove();
      document.getElementById('zipLabel').remove();
      document.getElementById('zipError').remove();
    }
  }
  //remove checkout button to prevent spoofing shipping cost
  if(document.getElementById('payForm')!=null){
    document.getElementById('payForm').remove();
  }
}

var globalProductArray = new Array();

function getCart(){
  $.ajax({
    url: '/getCart',
    type: 'get',
    success:function(data){
      globalProductArray = data;
      if(data.length == 0){
        var container = document.getElementById('container');
        container.innerHTML = "<h1 style='text-align:center;'>Cart is empty</h1>";
      } else{
        var subTotal = 0;
        var tBody = document.getElementById('cartTableBody');
        tBody.innerHTML = '';//empty first
        for (var i = 0; i < data.length; i++){
          var itemID = data[i].varId; //only added to help with backend ordering
          var name = data[i].name;
          var image = data[i].image;
          var qty = data[i].quantity;
          //size comes as part of the name when applicable i.e. Brick Tee - M
          var size = data[i].size;//may be NA if not applicable

          var price = data[i].price;
          subTotal = subTotal + parseFloat(price * qty) ;

          //create the itemitized cart
          var html = "<tr><td class='itemName' id="+itemID+"><img src="+image+" alt='Product Image' width='55'>"+name+"</td><td class='itemQty'><button id='qtyBtn' onclick=lowerQuantity("+itemID+")>-</button>"+qty+"<button id='qtyBtn' onclick=increaseQuantity("+itemID+")>+</button></td><td class='itemPrice'>$"
          +price+"</td><td class='deleteItem'><button class='btn' id='removeBtn' onclick='removeItem("+itemID+")'>Remove</button></td></tr>";
          tBody.innerHTML += html;
        }
        var formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        });
        subTotal = formatter.format(subTotal);
        document.getElementById('sTotal').innerHTML = subTotal;
      }
    },
    error: function(XMLHttpRequest, textStatus, errorThrown) {
      //  alert("Error occurred in getting merch products from server");
      console.log('error occurred in getting merch products')
      }
  });
};


function refreshCart(){
  $.ajax({
    url: '/getCart',
    type: 'get',
    success:function(data){
      globalProductArray = data;
      if(data.length == 0){
        var container = document.getElementById('container');
        container.innerHTML = "<h1 style='text-align:center;'>Cart is empty</h1>";
        document.getElementById('cartNotif').style.display = "none";
      } else{
        var subTotal = 0;
        var tBody = document.getElementById('cartTableBody');
        tBody.innerHTML = '';//empty first
        for (var i = 0; i < data.length; i++){
          var itemID = data[i].varId; //only added to help with backend ordering
          var name = data[i].name;
          var image = data[i].image;
          var qty = data[i].quantity;
          //size comes as part of the name when applicable i.e. Brick Tee - M
          var size = data[i].size;//may be NA if not applicable

          var price = data[i].price;
          subTotal = subTotal + parseFloat(price * qty) ;

          //create the itemitized cart
          var html = "<tr><td class='itemName' id="+itemID+"><img src="+image+" alt='Product Image' width='55'>"+name+"</td><td class='itemQty'><button id='qtyBtn' onclick=lowerQuantity("+itemID+")>-</button>"+qty+"<button id='qtyBtn' onclick=increaseQuantity("+itemID+")>+</button></td><td class='itemPrice'>$"
          +price+"</td><td class='deleteItem'><button class='btn' id='removeBtn' onclick='removeItem("+itemID+")'>Remove</button></td></tr>";
          tBody.innerHTML += html;
        }
        var formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        });
        subTotal = formatter.format(subTotal);
        document.getElementById('sTotal').innerHTML = subTotal;
        var notifs = 0;
        for (var i = 0; i < data.length; i++){
          var qty = data[i].quantity;
          notifs = notifs + qty;
        }
        //console.log(notifs)
        if(notifs == 0){
          document.getElementById('cartNotif').style.display = "none";
        } else {
          //console.log('setting to block')
          //console.log(document.getElementById('cartNotif'));
          document.getElementById('cartNotif').style.display = 'block';
          document.getElementById('cartNotif').innerHTML = notifs;
        }
      }
    },
    error: function(XMLHttpRequest, textStatus, errorThrown) {
      //  alert("Error occurred in getting merch products from server");
      console.log('error occurred in getting merch products')
      }
  });
};
