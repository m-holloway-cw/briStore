const MongoClient = require( 'mongodb' ).MongoClient;
const url = "mongodb://localhost:27017";

var _db;

module.exports = {

  connectToServer: function( callback ) {
    MongoClient.connect( url,  { useNewUrlParser: true }, function( err, client ) {
      if(err) throw err;
      _db  = client.db('');
      return callback( _db );
    } );
  },

  getDb: function() {
    return _db;
  },

  setupListeners: function(){
    return true; //temporary return true if worked, false if broken
  }
};
