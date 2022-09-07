console.log('print from javascript home file');

function getCommands(){
$.ajax({
    url: '/getCommands',
    type: 'get',
    success:function(data){
      if(data){
          console.log(data);
        } else {
        console.log('error in getting commands');
      }
    },
    error: function(XMLHttpRequest, textStatus, errorThrown) {
      alert("Error occurred in removing from cart");
    }
  });
}


$(document).ready(function(){
    getCommands();
});
