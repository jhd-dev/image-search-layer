var express = require("express");
var mongo = require("mongodb").MongoClient;
var path = require("path");
var Flickr = require("flickrapi");

var photoResults = 10;
var recentResults = 10;
var port = process.env.port || 8080;
var mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/urls';
var flickrOptions = {
    api_key: process.env.FLICKR_KEY,
    secret: process.env.FLICKR_KEY_SECRET
};
var app = express();

app.use('/', express.static(path.join(__dirname, 'public')));

app.get('/search/:text', function(req, res){
    var searchTerm = decodeURIComponent(req.params.text).replace(' ', '+');
    var offset = +req.query.offset || 0;
    Flickr.tokenOnly(flickrOptions, function(err, flickr){
        if (err) throw err;
        flickr.photos.search({
            api_key: flickrOptions.api_key,
            format: "json",
            text: searchTerm,
            sort: "relevance",
            extras: "description, url_o, url_t"
        }, function(err, result){
            if (err) throw err;
            //console.log(result.photos.photo);
            res.writeHead(200, {
                "Content-Type": "application/json" 
            });
            res.end(JSON.stringify(result.photos.photo.slice(offset, offset + photoResults).map(function(photo){
                return {
                    url: photo.url_o,
                    page: 'https://www.flickr.com/photos/' + photo.owner + '/' + photo.id,
                    thumbnail: photo.url_t,
                    description: photo.description._content
                };
            })));
            mongo.connect(mongoUrl, function(err, db){
                if (err) throw err;
                db.collection('searches').insert({
                    term: req.params.text,
                    when: new Date().toString()
                }, function(err, data){
                    if (err) throw err;
                    db.close();
                });
            });
        });
    });
});

app.get('/recent', function(req, res){
    mongo.connect(mongoUrl, function(err, db){
        if (err) throw err;
        db.collection('searches').find().sort({_id: -1}).limit(recentResults).toArray(function(err, searches){
            if (err) throw err;
            res.writeHead(200, {
                "Content-Type": "application/json" 
            });
            res.end(JSON.stringify(searches.map(function(search){
                return {
                    term: search.term,
                    when: search.when
                };
            })));
        });
    });
});

app.listen(port, function(){
    console.log("App listening on port " + port); 
});