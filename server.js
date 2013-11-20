var connect = require('connect'),
    domain = require("domain"),
    cluster = require("cluster"),
    webserver = connect(),
    socketServer = require('http').createServer().listen(8081),
    io = require('socket.io').listen(socketServer);

var domains = {},
    roomCurID = 0;

webserver.use(connect.logger('dev')).use(connect.static(__dirname));
connect.createServer(webserver).listen(8080);

io.sockets.on('connection', function (socket) {
  console.log("go into connection");
  var domainErrorHandler = function( e ){
        console.log( "error, but oh well", e.message);
        console.log( e.stack );
        console.log( e );
      },
      updateRoomList = function(){
        var roomIDs = [];

        for( var i in domains ){
          roomIDs.push( i );
        }

        socket.emit( 'roomListUpdate', roomIDs );
      };

  socket.on("createRoom", function(){
    console.log("it's received a create room");
    var domainID = roomCurID++,
        dmn = domain.create();

      dmn.on("error", domainErrorHandler);
      dmn.run(function(){
        // setTimeout(function(){
        //   throw new Error("it's an customer error");
        // }, 1000);
        console.log("create a new room, room id is:" + domainID );
      });

      socket.emit( "createRoomSucc", domainID );
      updateRoomList();
  });
});