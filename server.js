var express = require('express'),
    fs = require('fs'),
    path = require('path'),
    request = require('request'),
    app = express(),   
    Twit = require('twit'),
    request = require('request'),
    https = require('https'),
    randomFloat = require('random-float'),
    config = {
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        access_token: process.env.ACCESS_TOKEN,
        access_token_secret: process.env.ACCESS_TOKEN_SECRET
    };

var T = new Twit(config);

// HELPER FUNCTIONS

function random_from_array(images) {
  return images[Math.floor(Math.random() * images.length)];
}

function getCountry(body) {
  var address_info = body.results[0].address_components;
  for (var i = 0; i < address_info.length; i ++) {
    var info = address_info[i];
    if (info.types.includes("country")) {
      return info.long_name;
    }
  }
}

function getLocationName(body) {
  var address_info = body.results[0].address_components;
  var locationName = "";
  for (var i = 0; i < address_info.length; i ++) {
    var info = address_info[i];
    if (info.types.includes("administrative_area_level_2")) {
      locationName += info.long_name + ", ";
    }
    if (info.types.includes("administrative_area_level_1")) {
      locationName += info.long_name + ", ";
    }
    if (info.types.includes("country")) {
      locationName += info.long_name;
    }
  }
  return locationName;
}

// WEBSITE

app.get("/", function (request, response) {
    response.writeHeader(200, {"Content-Type": "text/html"});  
    response.write('<h1>antipode-bot</h1><a href="https://glitch.com/edit/#!/antipode-bot">Check out the source code</a>');  
    response.end();  
});

// TWEET FUNCTION

app.all("/tweet", function (request, response) {
  console.log("Received a request...");
  generateLatsLons();
});

function generateLatsLons() {
  var lat1 = randomFloat(-90, 90).toFixed(3);
  var lon1 = randomFloat(-180, 180).toFixed(3);
  var lat2 = (-lat1).toFixed(3);
  var lon2 = (180 - Math.abs(lon1)).toFixed(3);
  if (lon1 > 0) {
    lon2 = -lon2;
  }
  
  console.log(lat1 + ", " + lon1);
  console.log(lat2 + ", " + lon2);
  
  getLocation1(lat1, lon1, lat2, lon2);
}

function getLocation1(lat1, lon1, lat2, lon2) {
  // make URL
  var url = "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + lat1 + "," + lon1 + "&key=" + process.env.GOOGLE_API;
  var request = https.get(url, function (response) {
    // data is streamed in chunks from the server
    // so we have to handle the "data" event    
    var buffer = "", 
          data,
          route;

      response.on("data", function (chunk) {
          buffer += chunk;
      }); 

      response.on("end", function (err) {
      // finished transferring data
      // dump the raw data
      var body1 = JSON.parse(buffer);
      var status1 = body1.status;
      if (status1 == "OK" && getCountry(body1) != "Antarctica") {
        console.log("Location 1: " + getLocationName(body1))
        getLocation2(body1, lat1, lon1, lat2, lon2);
      }
      else {
        generateLatsLons();
      }
    });
  });
}

function getLocation2(body1, lat1, lon1, lat2, lon2) {
  // make URL
  var url = "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + lat2 + "," + lon2 + "&key=" + process.env.GOOGLE_API;
  var request = https.get(url, function (response) {
    // data is streamed in chunks from the server
    // so we have to handle the "data" event    
    var buffer = "", 
          data,
          route;

      response.on("data", function (chunk) {
          buffer += chunk;
      }); 

      response.on("end", function (err) {
      // finished transferring data
      // dump the raw data
      var body2 = JSON.parse(buffer);
      var status2 = body2.status;
      if (status2 == "OK" && getCountry(body2) != "Antarctica") {
        console.log("Location 2: " + getLocationName(body2))
        uploadImage1(body1, body2, lat1, lon1, lat2, lon2);
      }
      else {
        generateLatsLons();
      }
    });
  });
}

function uploadImage1(body1, body2, lat1, lon1, lat2, lon2) {
  console.log('Image 1 loading ...');
  var urls = ["https://maps.googleapis.com/maps/api/staticmap?format=jpg&scale=2&maptype=hybrid&center=" + lat1 + "," + lon1 + "&zoom=8&size=600x300&key=" + process.env.GOOGLE_API];
  request({url: random_from_array(urls), encoding: null}, function (err, res, body) {
    if (!err && res.statusCode == 200) {
      var b64content = 'data:' + res.headers['content-type'] + ';base64,',
          image = body.toString('base64');
      console.log('Image 1 loaded!');
      
      T.post('media/upload', { media_data: image }, function (err, data, response) {
        if (err){
          console.log('ERROR:');
          console.log(err);
          // response.sendStatus(500);
        }
        else{
          console.log('Image 1 uploaded!');
          uploadImage2(body1, body2, lat1, lon1, lat2, lon2, data.media_id_string)
        }
      });
    }
  });
}

function uploadImage2(body1, body2, lat1, lon1, lat2, lon2, media_id_string1) {
  console.log('Image 2 loading ...');
  var urls = ["https://maps.googleapis.com/maps/api/staticmap?format=jpg&scale=2&maptype=hybrid&center=" + lat2 + "," + lon2 + "&zoom=8&size=600x300&key=" + process.env.GOOGLE_API];
  request({url: random_from_array(urls), encoding: null}, function (err, res, body) {
    if (!err && res.statusCode == 200) {
      var b64content = 'data:' + res.headers['content-type'] + ';base64,',
          image = body.toString('base64');
      console.log('Image 2 loaded!');
      
      T.post('media/upload', { media_data: image }, function (err, data, response) {
        if (err){
          console.log('ERROR:');
          console.log(err);
          // response.sendStatus(500);
        }
        else{
          console.log('Image 2 uploaded!');
          postTweet(body1, body2, lat1, lon1, lat2, lon2, media_id_string1, data.media_id_string)
        }
      });
    }
  });
}

function postTweet(body1, body2, lat1, lon1, lat2, lon2, media_id_string1, media_id_string2) {
  var message = "📍 " + getLocationName(body1) + "\nLatitude: " + lat1 +  "\nLongitude: "+ lon1 + "\n" + "📍 " + getLocationName(body2) + "\nLatitude: " + lat2 +  "\nLongitude: "+ lon2;
  var params = { 
    status: message, 
    media_ids: [media_id_string1, media_id_string2] 
  }
  
  T.post('statuses/update', params, function(err, data, response) {
    if (err) {
      /* TODO: Proper error handling? */
      console.log('Error!');
      console.log(err);
    }
    else {
      console.log("Tweeted at " + new Date() + "!");
    }
  });
}

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});