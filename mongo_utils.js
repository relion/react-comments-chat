const fs = require("fs");
const path = require("path");
var MongoClient = require("mongodb").MongoClient;

var mongo_url = `mongodb://${fs.readFileSync(
  process.cwd() + path.sep + "mongo-auth.txt"
)}localhost:27017/`;

var fb_dbo;
MongoClient.connect(
  mongo_url,
  { useUnifiedTopology: true },
  function (err, db) {
    if (err) throw "Failed to connect to mongoDB: " + err;
    console.log(
      `MongoDB is connected on: ` + mongo_url.replace(/(?<=:)[^:]+(?=@)/, "xx") // hide the password
    );
    fb_dbo = db.db("faithbit");
    delete_usless_properties();
  }
);

var to_del = 0;

function delete_usless_properties() {
  var rooms = fb_dbo.collection("comments").find();
  rooms.forEach((room) => {
    console.log("room: " + room.room_title);
    var n_deleted = 0;
    room.comments_ar.forEach((comment) => {
      if (comment.browser_id != undefined) {
        n_deleted++;
        delete comment.browser_id;
      }
    });
    if (n_deleted != 0) {
      to_del++;
      fb_dbo.collection("comments").replaceOne({ _id: room._id }, room, () => {
        console.log("deleted " + n_deleted + " useless browser_id properties.");
        to_del--;
      });
    }
  }, wait_for_completion_and_exit);
}

function wait_for_completion_and_exit() {
  if (to_del > 0) {
    console.log("waiting for operations to complete...");
    setTimeout(wait_for_completion_and_exit, 200);
    return;
  }
  console.log("done.");
  process.exit();
}
