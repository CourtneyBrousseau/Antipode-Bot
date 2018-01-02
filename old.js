/* Respond to @ mentions */
  fs.readFile(__dirname + '/last_mention_id.txt', 'utf8', function (err, last_mention_id) {
    /* First, let's load the ID of the last tweet we responded to. */
    console.log('last_mention_id:', last_mention_id);

    T.get('search/tweets', { q: 'to:' + process.env.TWITTER_HANDLE + ' -from:' + process.env.TWITTER_HANDLE, since_id: last_mention_id }, function(err, data, response) {
      /* Next, let's search for Tweets that mention our bot, starting after the last mention we responded to. */
      if (data.statuses.length){
        // console.log(data.statuses);
        data.statuses.forEach(function(status) {
          console.log(status.id_str);
          console.log(status.text);
          console.log(status.user.screen_name);
          var info = status.text.split(" ");
          respondwithCandidates(status, info[1], info[2], info[3]);
          });                  
      } else {
        /* No new mentions since the last time we checked. */
        console.log('No new mentions...');      
      }
    });    
  });
  
  /* TODO: Handle proper responses based on whether the tweets succeed, using Promises. For now, let's just return a success message no matter what. */
  response.sendStatus(200);
});

function respondwithCandidates(status, state, district, year) {
  // make URL
  var url = "https://api.open.fec.gov/v1/candidates/totals/?";
  url += "district=" + district;
  url += "&state=" + state;
  url += "&api_key=" + process.env.FEC_API;
  url += "&election_year=" + year;
  url += "&page=1&sort=name&per_page=20";
  
  var request = http.get(url, function (response) {
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
        var body = JSON.parse(buffer);
        var candidates = body.results;
        getInfoForCandidates(status, candidates, state, district, year);
        var end = "You can find more information about this election here: https://www.fec.gov/data/elections/house/" + state + "/" + district + "/" + year + "/";
        sendResponseTweet(status, end);
    });
  });
}

function getInfoForCandidates(status, candidates) {
  for (var i = 0; i < candidates.length; i++) {
    var reply = "";
    var candidate = candidates[i];
    reply += candidate.name + " (" + candidate.party + ")\n";
    reply += "Total Raised: $" + candidate.receipts + "\n";
    reply += "Cash On Hand: $" + candidate.cash_on_hand_end_period + "\n";
    /*reply += "Learn more about this candidate: https://www.fec.gov/data/candidate/" + candidate.candidate_id;*/
    sendResponseTweet(status, reply);
  }
}

function sendResponseTweet(status, text) {
  console.log("Tweeting ...");
  
}