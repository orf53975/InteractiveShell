module.exports = function(clients, logExceptOnTest) {
  var exists = function(clientId) {
    console.log('*** we are checking ....' + clientId);
    if (clientId in clients) {
      logExceptOnTest("*** Client already exists");
      return true;
    }
    logExceptOnTest("*** Client did not already exists");
    return false;
  };
  return {
    getNewId: function() {
      clients.totalUsers += 1;
      var clientId;
      do {
        var randomId = Math.random() * 2;
        randomId = Math.floor(randomId);
        clientId = "user" + randomId.toString(10);
      } while (exists(clientId));
      logExceptOnTest("*** New Client ID " + clientId);
      return clientId;
    }
  };
};
