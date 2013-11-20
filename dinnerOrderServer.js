var isDev = false;
var socketPort = isDev ? 8082 : 8081,
	webPort = isDev ? 8083 : 8080;

var connect = require('connect'),
	domain = require("domain"),
	fs = require("fs"),
	SocketIOFileUploadServer = require('socketio-file-upload'),
    socketServer = require('http').createServer().listen(socketPort),
    io = require('socket.io').listen(socketServer),
    webserver = connect();

webserver.use(connect.logger('dev')).use(connect.static(__dirname));
connect.createServer(webserver).use(SocketIOFileUploadServer.router).listen(webPort);

function OrderUtils(){
	this.orders = {};
	this.idAutoIncrease = 1;
}

OrderUtils.prototype = {
	getAll : function(){
		var tmp = [];

		for( var i in this.orders ){
			tmp.push( this.orders[ i ] );
		}

		return tmp;
	},
	removeAll : function(){
		for( var i in this.orders ){
			delete this.orders[i];
		}
	},
	remove : function( data ){
		if( this.orders[ data.id ] ){
			delete this.orders[ data.id ];
		}
	},
	append : function( data ){
		if( data ){
			var id = this.idAutoIncrease++;

			this.orders[ id ] = {
				id : id,
				user : data.user,
				msg : data.msg,
				price : data.price
			};
		}
	}
};

function MsgUtils(){
	this.msgs = [];
	this.orderKey = "#点饭#";
}

MsgUtils.prototype = {
	getAll : function(){
		return this.msgs;
	},
	append : function( data ){
		if( data ){
			this.msgs.push( data );

			if( this.msgs.length > 100 ){
				this.msgs.splice( 0, this.msgs.length - 81 );
			}
		}
	},
	isDinnerOrder : function( data ){
		return data.msg.indexOf(this.orderKey) >= 0;
	},
	getDinnerOrder : function( data ){
		var obj = null;

		if( this.isDinnerOrder( data ) ){
			var msg = data.msg;

			while( msg.indexOf( this.orderKey ) >= 0 ){
				msg = msg.trim().replace( this.orderKey, "" );
			}

			obj = {
				user : data.user,
				msg : msg,
				price : data.price
			}
		}

		return obj;
	},
	validate : function( data ){
		console.log( data );
		if( !data || !data.user || !data.msg || data.msg.trim() == "" ){
			return false;
		}

		return true;
	}
}

function MenuUtils(){};
MenuUtils.prototype = {
	getMenuList : function(){
		try{
			var fsList = fs.readdirSync("menu"),
				menuList = [];
			
			for (var i = 0; i < fsList.length; i++) {
				var tmp = fsList[i];

				if( /\.(jpg|png)$/.test( tmp ) ){
					menuList.push( "menu/" + tmp );
				}
			};

			return menuList;
		}catch( e ){
			console.error( e );
		}
	},
	removeMenu : function( url, callback ){
		fs.exists( url, function( exists ){
			if( exists ){
				fs.unlink( url, function( err ){
					if( err ){
						console.error( err );
					}

					if( callback ){
						try{
							callback();
						}catch( e ){
							console.error( e.stack );
						}
					}
				} );
			}

		});
	}
}

var orderUtils = new OrderUtils(),
	msgUtils = new MsgUtils(),
	menuUtils = new MenuUtils();

io.sockets.on('connection', function (socket) {
	console.log("new socket is connected");
	socket.join("all");

	socket.emit( "refreshMenu", menuUtils.getMenuList() );
	socket.emit( "refreshOrders", orderUtils.getAll() );
	socket.emit( "refreshChats", msgUtils.getAll() );

	socket.on("commit", function( data ){
		if( !data || !msgUtils.validate( data ) ){
			socket.emit("error", { errorCode: 1, msg : "message is null" });
			return;
		}

		/**
		 * process dinner order module
		 */
		if( msgUtils.isDinnerOrder( data ) ){
			var order = msgUtils.getDinnerOrder( data );
			orderUtils.append( order );
			socket.emit("orderSuccess", { msg : "request is received" } );
			socket.emit("refreshOrders", orderUtils.getAll() );
			socket.broadcast.emit("refreshOrders", orderUtils.getAll() );
			return;
		}

		/**
		 * process chat order model
		 */
		msgUtils.append( data );
		socket.emit( "chatSuccess", { msg : "request is received" } );
		socket.emit( "refreshChats", msgUtils.getAll() );
		socket.broadcast.emit( "refreshChats", msgUtils.getAll() );
	});

	socket.on("removeOrder", function( data ){
		orderUtils.remove( data );
		socket.emit("refreshOrders", orderUtils.getAll() );
		socket.broadcast.emit("refreshOrders", orderUtils.getAll() );
	});

	socket.on("clearAllOrders", function( data ){
		orderUtils.removeAll();
		socket.emit("refreshOrders", orderUtils.getAll() );
		socket.broadcast.emit("refreshOrders", orderUtils.getAll() );
	});

	socket.on("removeMenu", function( data ){
		menuUtils.removeMenu( data, function(){
	    	socket.emit( "refreshMenu", menuUtils.getMenuList() );
	    	socket.broadcast.emit( "refreshMenu", menuUtils.getMenuList() );
		} );
	});

	socket.on("error", function( data ){
		console.log("error");
	})

	var uploaderDomain = domain.create();
	uploaderDomain.add( socket );

	uploaderDomain.run(function(){
		var uploader = new SocketIOFileUploadServer();
	    uploader.dir = "menu";
	    uploader.listen(socket);
	    uploader.on("saved", function(event){
	    	socket.emit( "refreshMenu", menuUtils.getMenuList() );
	    	socket.broadcast.emit( "refreshMenu", menuUtils.getMenuList() );
	        console.log(event.file);
	    });
	});
});