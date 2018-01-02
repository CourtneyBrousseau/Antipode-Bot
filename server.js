/* Setting things up. */
var fs = require('fs'),
    path = require('path'),
    req = require('request'),
    express = require('express'),
    app = express(),   
    Twit = require('twit'),
    https = require("https"),
    randomFloat = require('random-float'),
    gm = require('gm'),
    request = require('request'),
    config = {
    /* Be sure to update the .env file with your API keys. See how to get them: https://botwiki.org/tutorials/make-an-image-posting-twitter-bot/#creating-a-twitter-app*/      
      twitter: {
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        access_token: process.env.ACCESS_TOKEN,
        access_token_secret: process.env.ACCESS_TOKEN_SECRET
      }
    },
    T = new Twit(config.twitter);

app.use(express.static('public'));

/* You can use uptimerobot.com or a similar site to hit your /tweet endpoint to wake up your app and make your Twitter bot tweet. */
  
var listener = app.listen(process.env.PORT, function () {
  console.log('Your bot is running on port ' + listener.address().port);
});

app.all("/tweet", function (request, response) {
  generateLatsLons();
  response.sendStatus(200);
});

function generateLatsLons() {
  var lat1 = randomFloat(-90, 90).toFixed(3);
  var lon1 = randomFloat(-180, 180).toFixed(3);
  var lat2 = (-lat1).toFixed(3);
  var lon2 = (180 - Math.abs(lon1)).toFixed(3);
  if (lon1 > 0) {
    lon2 = -lon2;
  }
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
        getImage1(body1, body2, lat1, lon1, lat2, lon2);
      }
      else {
        generateLatsLons();
      }
    });
  });
}

function getImage1(body1, body2, lat1, lon1, lat2, lon2) {
  // make URL
  var src = "https://www.newyorker.com/wp-content/uploads/2014/05/140512_a18203-600.jpg";
  // var src = "https://maps.googleapis.com/maps/api/staticmap?format=jpg&scale=2&maptype=satellite&center=" + lat1 + "," + lon1 + "&zoom=10&size=600x300&key=" + process.env.GOOGLE_API;
  console.log(src);
  var reqsrc = request(src);
  console.log(reqsrc);
  var gmreqsrc = gm(reqsrc);
  console.log(gmreqsrc);
  gmreqsrc.toBuffer('JPG', function(err, buffer) {
    if (err) { 
      console.log(err); 
    } else {
      var image1 = buffer.append('public/img/caption-bg.jpg').toString('base64');
      T.post('media/upload', {media_data: image1}, function(err, data, response) {
        if (err) { console.log(err); }
        // Add meta data
        var mediaIdStr1 = data.media_id_string;
        var altText = lat1 + "," + lon1;
        var meta_params = { media_id: mediaIdStr1, alt_text: { text: altText } }
        // Post the tweet
        T.post('media/metadata/create', meta_params, function (err, data, response) {
          if (err) { console.log(err); }
          if (!err) {
            // now we can reference the media and post a tweet (media will attach to the tweet)
            getImage2(body1, body2, lat1, lon1, lat2, lon2, mediaIdStr1);
          }
        })
      });
    }
  });
}

function getImage2(body1, body2, lat1, lon1, lat2, lon2, mediaIdStr1) {
  // make URL
  var url = "https://maps.googleapis.com/maps/api/staticmap?format=jpg&scale=2&maptype=satellite&center=" + lat2 + "," + lon2 + "&zoom=10&size=600x300&key=" + process.env.GOOGLE_API;
  console.log(url);
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
      constructTweet(body1, body2, lat1, lon1, lat2, lon2, mediaIdStr1);
    });
  });
}



function constructTweet(body1, body2, lat1, lon1, lat2, lon2, mediaIdStr1) {
  tweet("📍 " + getLocationName(body1) + " | " + lat1 + ", " + lon1 + "\n\n\n" + "📍 " + getLocationName(body2) + " | " + lat2 + ", " + lon2, mediaIdStr1);
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

function getCountry(body) {
  var address_info = body.results[0].address_components;
  for (var i = 0; i < address_info.length; i ++) {
    var info = address_info[i];
    if (info.types.includes("country")) {
      return info.long_name;
    }
  }
}

function tweet(message, mediaIdStr1) {
  var params = { status: message, media_ids: [mediaIdStr1] }
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