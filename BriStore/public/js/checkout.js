var globalProductArray = new Array();


function getCart(){
  $.ajax({
    url: '/getCart',
    type: 'get',
    success:function(data){
      console.log(data)
      if(data.length == 0){
        document.getElementById('cartContainer').innerHTML = "Cart is empty";
      } else{
        var tBody = document.getElementById('cartTableBody');
        for (var i = 0; i < data.length; i++){
          var itemID = data[i].varId; //only added to help with backend ordering
          var name = data[i].name;
          var image = data[i].image;
          var qty = data[i].quantity;
          //size comes as part of the name when applicable i.e. Brick Tee - M
          var size = data[i].size;//may be NA if not applicable

          var price = data[i].price;
          console.log(name);

          //todo create options for changing quantity
          //put price into a total variable for subtotal
          //save shipping/taxes for checkout maybe

          //create the itemitized cart
          var html = "<tr><td class='itemName'>"+name+"</td><td class='itemQty'>"+qty+"</td><td class='itemPrice'>$"
          +price+"</td></tr>";
          tBody.innerHTML += html;
        }
      }
    },
    error: function(XMLHttpRequest, textStatus, errorThrown) {
      //  alert("Error occurred in getting merch products from server");
      console.log('error occurred in getting merch products')
      }
  });
};


$(document).ready(function(){
  getCart();
});
