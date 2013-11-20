var http = require( "http" );
var option = {
	hostname : "s0.syj.immt.com",
	port : 80,
	path : "/game/campaign/forward?jsoncallback=jsonp1382672220476&_=1382672244496&map=80037&formation=%5B%222%22%2C%221%22%2C%223%22%5D&key=6b6f6750bf43060242724086a8bfc976&_l=chs&_p=EW",
	method : "GET"
}

var reqFunc = function(){
	var req = http.request( option , function( res ){
		console.log('STATUS: ' + res.statusCode);
		console.log('HEADERS: ' + JSON.stringify(res.headers));
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			console.log('BODY: ' + chunk);
		});
	});

	req.end();
}

setInterval( reqFunc, 1000 );