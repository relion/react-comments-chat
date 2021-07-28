require("dotenv").config();
var os = require("os");
console.log(`WatchCast Server has Started on ${os.hostname()} ...`);
var tnc = require("./tnc.js");
const fs = require("fs");
const path = require("path");
const dns = require("dns");
var MongoClient = require("mongodb").MongoClient;
var mongo_url = `mongodb://${process.env.DB_MONGO_AUTH}localhost:27017/`;
var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");
const dateFormat = require("dateformat");

let transporter = nodemailer.createTransport(
  smtpTransport({
    service: "gmail",
    auth: {
      user: process.env.ADMIN_EMAIL,
      pass: process.env.ADMIN_EMAIL_PWD,
    },
  })
);

function sendmail(from, to, subject, text) {
  transporter.sendMail(
    {
      from: from,
      to: to,
      subject: subject,
      text: text,
    },
    function (error, info) {
      if (error) {
        console.err("Failed to send mail: " + error);
      } else {
        console.log("Email sent. " + info.response);
      }
    }
  );
}

if (!process.execPath.startsWith("C:\\")) {
  dns.lookup(os.hostname(), function (err, local_host_ip, fam) {
    // console.log(`WatchCast Server has Started on ${local_host_ip} ...`);
    sendmail(
      "WatchCast Sever <watchcast.project@gmail.com>",
      "Aryeh Tuchfeld <watchcast.project@gmail.com>",
      "WatchCast Server has Started",
      "Server at IP: " + local_host_ip + " hostname: " + os.hostname()
    );
  });
}

var fb_dbo;
MongoClient.connect(
  mongo_url,
  { useUnifiedTopology: true },
  function (err, db) {
    if (err) throw "Failed to connect to mongoDB: " + err;
    tnc.set_books_dbo(db.db("Books"));
    fb_dbo = db.db("faithbit");
    console.log(
      `MongoDB is connected on: ` + mongo_url.replace(/(?<=:)[^:]+(?=@)/, "xx") // hide the password
    );
  }
);

const url = require("url");
const express = require("express");
const http_server = express();
http_server.set(
  "port",
  process.execPath.startsWith("C:\\") ? 8080 : process.env.PORT || 80
);
const bodyParser = require("body-parser");
http_server.use(bodyParser.text({ type: "text/html" }));
http_server.use(express.json());
http_server.use(bodyParser.urlencoded({ extended: false }));
const uuidv1 = require("uuid/v1");

const WebSocket = require("ws");

const ws_port = 3030;
const wss = new WebSocket.Server({ port: ws_port, pingTimeout: 60000 });
console.log("WebSocket Server is listening on port: " + ws_port);

wss.on("error", (error) => {
  console.log("WebSocket.Server Error.");
});

var ws_by_id = {};
var all_participants = {};
var browsers_ids_by_title = {};
browsers_ids_by_title["/Monitor/"] = {};

var last_rooms_status = undefined;

function check_rooms_status() {
  var res = {};
  var rooms_titles = Object.keys(browsers_ids_by_title);
  for (var i = 0; i < rooms_titles.length; i++) {
    var room_title = rooms_titles[i];
    res[room_title] = [];
    var room_browsers_ids = Object.keys(browsers_ids_by_title[room_title]);
    for (j = 0; j < room_browsers_ids.length; j++) {
      var x = all_participants[room_browsers_ids[j]];
      if (x != null) {
        res[room_title].push(x);
      }
    }
  }

  var current_rooms_status = JSON.stringify(res);

  if (last_rooms_status != current_rooms_status) {
    last_rooms_status = current_rooms_status;
    console.log(`Rooms Status Changed: ${current_rooms_status}`);
    broadcast("/Monitor/", null, {
      op: "rooms_status_changed",
      rooms_status: current_rooms_status,
    });
  }

  setTimeout(check_rooms_status, 2000);
}
setTimeout(check_rooms_status, 2000);

wss.on("connection", function connection(ws, req) {
  var app_name = req.url;
  var app_ip = rAddr_to_ip(ws._socket.remoteAddress);
  console.log(`got WS connection from: ${app_ip} ${app_name}`);
  var browser_id = uuidv1();
  ws.browser_id = browser_id;
  var ws_connected_json_data = {
    op: "ws_connected",
    browser_id: browser_id,
  };
  ws.send(JSON.stringify(ws_connected_json_data));
  ws_by_id[browser_id] = ws;
  all_participants[browser_id] = {
    ip: rAddr_to_ip(ws._socket.remoteAddress),
  };

  if (app_name == "/Monitor/") {
    ws_by_id[browser_id].room_title = app_name;
    browsers_ids_by_title[app_name][browser_id] = ws;
    var fname = process.cwd() + "/src/aryeh_ip.txt";
    //console.log("Writing to: " + fname);
    fs.writeFileSync(fname, app_ip);
  }

  ws.on("message", function (msg) {
    var json = JSON.parse(msg);
    //
    var sender_name = undefined;
    var p = all_participants[ws.browser_id];
    if (p != undefined) {
      sender_name = p.name;
    }
    console.log(
      `got msg from browser_id: ${ws.browser_id} room: \`${ws.room_title}\` op: \`${json.op}\` name: \`${sender_name}\``
    );
    //
    switch (json.op) {
      case "client_changed_name":
        all_participants[browser_id].name = json.name;
        broadcast(ws.room_title, ws.browser_id, {
          op: json.op,
          browser_id: ws.browser_id,
          name: json.name,
          ip: all_participants[browser_id].ip,
        });
        break;
      case "client_message_entered_changed":
      case "client_message_entered_ceased":
        all_participants[browser_id].entered_message = json.entered_message;
        broadcast(ws.room_title, ws.browser_id, {
          op: json.op,
          browser_id: ws.browser_id,
          entered_message: json.entered_message,
        });
        break;
      case "client_disabled_report_typing":
        all_participants[browser_id].entered_message = json.entered_message;
        broadcast(ws.room_title, ws.browser_id, {
          op: json.op,
          browser_id: ws.browser_id,
        });
        break;
      default:
        throw "websocket received an unsupported message op: `" + json.op + "`";
    }
  });
  ws.on("close", function () {
    var name = all_participants[ws.browser_id].name;
    console.log(
      "Client disconnected from room: `" +
        ws.room_title +
        "` browser_id: " +
        ws.browser_id +
        (name != undefined ? " name: `" + name + "`" : "")
    );
    delete ws_by_id[browser_id];
    delete all_participants[browser_id];
    if (browsers_ids_by_title["/Monitor/"][browser_id] != undefined)
      delete browsers_ids_by_title["/Monitor/"][browser_id];
    broadcast(ws.room_title, browser_id, {
      op: "client_left",
      browser_id: browser_id,
    });
  });
});

var scheme = require("http"); // later: https
const { default: Avatar } = require("react-avatar");
const { Console } = require("console");

// for https, use listen to port: 443
// var privateKey = fs.readFileSync('privatekey.pem').toString();
// var certificate = fs.readFileSync('certificate.pem').toString();

scheme
  .createServer(
    {
      key: "",
      cert: "",
    },
    http_server
  )
  .listen(http_server.get("port"), () => {
    console.log(
      `Http Server is running at: http://localhost:${http_server.get("port")}/`
    );
  });

function broadcast(room_title, by_browser_id, data) {
  var bids = browsers_ids_by_title[room_title];
  if (bids == undefined) {
    console.log(
      `in broadcast. room: \`${room_title}\` is Empty. probably because the server restarted. todo...`
    );
    return;
  }
  for (id in bids) {
    var ws = ws_by_id[id];
    if (id != undefined && id != by_browser_id) {
      // lilo
      if (
        ws != undefined &&
        ws.readyState === 1 &&
        (ws.room_title == room_title || room_title == "/Monitor/")
      ) {
        ws.send(JSON.stringify(data)); // '{ "_id": -1, "message": "Hello World2" }'
      }
    }
  }
  var n_other_peers = Object.keys(bids).length - 1;
  console.log(
    `Broadcasting msg: \`${data.op}\` to room: \`${room_title}\` with ${
      n_other_peers < 1 ? "no" : n_other_peers
    }${n_other_peers == -1 ? "" : " other"} peer${
      n_other_peers == 1 ? "" : "s"
    }`
  );
}

http_server.get("*", function (req, res, next) {
  // if (/(?<![0-9])(84\.228\.233\.54)$/i.test(req.ip)) {
  //   console.log("Hi, it's me..." + req.ip);
  // }

  if (/(?<![0-9])(180\.123\.81\.87)$/i.test(req.ip)) {
    res.body = "Please don't bother my site. Thanks.";
    res.send();
    res.end();
    console.log("Rejected: " + req.ip);
    return;
  }
  var rel_url = req.params[0];

  if (/^\/MM\//.test(rel_url)) {
    var ip = rAddr_to_ip(req.connection.remoteAddress);
    dns.reverse(ip, (err, hostnames) => {
      var hostnames_str = "";
      if (!err && hostnames.length > 0) {
        hostnames_str = " hostname: " + hostnames;
      }
      console.log(`get: ${rel_url} from: ${ip}` + hostnames_str);
    });
    next();
    return;
  }

  var url_file_path =
    process.cwd() +
    path.sep +
    "src" +
    rel_url.replace(/\/$/, "").replace(/\//g, path.sep); // lilo: is it needed?..
  var is_file = false;
  try {
    var stats = fs.lstatSync(url_file_path);
    is_file = stats.isFile();
  } catch (ex) {}

  if (rel_url == "/handle_comments/") {
    handle_http_request(req, res);
  } else if (/^\/(tnc|comments|monitor)[\/]?$/i.test(rel_url)) {
    const filePath = process.cwd() + "/src/comments/index.html"; // where the <div id="root"> is.
    var html = fs.readFileSync(filePath, "utf8");

    var html = replace_html(
      req,
      html,
      (/^\/comments/i.test(rel_url)
        ? req.query.title.replace(/_/g, " ")
        : /^\/monitor/i.test(rel_url)
        ? "Monitor"
        : /^\/tnc/i.test(rel_url)
        ? "Bible English Search"
        : "undefined") + " | Watchcast",
      "Click here to Enter the Chat Room"
    );

    res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.header("Expires", "-1");
    res.header("Pragma", "no-cache");
    res.send(html);
    res.end();
    return;
  } else if (/127\.0\.0\.1$/i.test(req.ip) && rel_url == "/whm-server-status") {
    // lilo: what's that?
    // console.log(`ignoring request. path: ${rel_url} from: ${req.ip}`);
    next();
    return;
  } else if (rel_url == "/" || !is_file) {
    var html;
    if (rel_url == "/") {
      var html = fs.readFileSync(
        process.cwd() + "/src/pages/home-page.html",
        "utf8"
      );
      html = replace_html(
        req,
        html,
        "WatchCast",
        "This site is meant to serve discussions..."
      );
      html = html.replace(
        /\$DATE/g,
        dateFormat(new Date().toUTCString(), "dd-mmm-yyyy")
      );
    } else {
      var html = fs.readFileSync(
        process.cwd() + "/src/pages/default-page.html",
        "utf8"
      );
      replace_html(req, html, "WatchCast Default page", "");
    }
    res.send(html);
    res.end();

    var ip = rAddr_to_ip(req.connection.remoteAddress);

    dns.reverse(ip, (err, hostnames) => {
      var hostnames_str = "";
      if (!err) {
        hostnames_str = " hostname: " + hostnames;
      }
      console.log(
        `default request. path: ${rel_url} from: ${ip}` + hostnames_str
      );
    });
  } else {
    next();
  }
});

//http_server.use(express.static("/MM/"), express.static("MM"));
http_server.use(express.static("/"), express.static("src"));
http_server.use("/MM", express.static(path.join(__dirname, "MM")));

http_server.get("/tnc_query", (req, res) => {
  // yishay
  tnc.handle_tnc_query(res);
});

http_server.post("/webhooks", (req, res) => {
  console.log("got webhook message: " + JSON.stringify(req.body));
  // res.redirect("http://84.228.238.88:1300/webhooks");
  res.end();
});

http_server.post("/handle_comments", (req, res) => {
  handle_http_request(req, res);
});

function handle_http_request(req, res) {
  var op = req.query.op;
  var room_title = req.query.title;
  var browser_id = req.query.browser_id;

  if (op == "comment_added") {
    var comment_json = JSON.parse(req.body);
    comment_json._id = uuidv1();
    comment_json.time = new Date().toUTCString();
    comment_json.user_ip = rAddr_to_ip(req.connection.remoteAddress);
    // comment_json.browser_id = browser_id;
    //
    fb_dbo.collection("comments").updateOne(
      { room_title: room_title },
      {
        $push: { comments_ar: comment_json },
      },
      function (err, result) {
        broadcast(room_title, browser_id, {
          op: op,
          browser_id: browser_id,
          comment: comment_json,
        });
        res.write(JSON.stringify(comment_json));
        res.end();
      }
    );
    return;
  } else if (op == "get_all_comments") {
    handle_first_http_request(req);
    broadcast(room_title, browser_id, {
      op: "client_joined",
      browser_id: browser_id,
      name: req.query.name,
    });

    var participants = {};
    for (var _browser_id in browsers_ids_by_title[room_title]) {
      if (_browser_id == browser_id) continue;
      var all_participant = all_participants[_browser_id];
      if (all_participant == undefined) continue;
      participants[_browser_id] = {}; // ip: req.ip
      var participant = participants[_browser_id];
      participant.name = all_participant.name;
      participant.entered_message = all_participant.entered_message;
    }

    fb_dbo.collection("comments").findOne(
      { room_title: room_title },
      function (err, result) {
        if (result == null) {
          var empty_comments_ar = [];
          fb_dbo.collection("comments").insert(
            {
              "room_title": room_title,
              "comments_ar": empty_comments_ar,
            },
            function (err, result) {
              res.write(
                JSON.stringify({
                  comments: empty_comments_ar,
                  participants: this.participants,
                })
              );
              res.end();
            }
          );
        } else {
          res.write(
            JSON.stringify({
              comments: result.comments_ar,
              participants: this.participants,
            })
          );
          res.end();
        }
      }.bind({ participants: participants })
    );
    return;
  } else if (op == "comment_deleted") {
    var comment_id = req.body;
    fb_dbo.collection("comments").updateOne(
      { room_title: room_title },
      {
        $pull: { comments_ar: { _id: comment_id } },
      },
      function (err, result) {
        res.end();
        broadcast(room_title, browser_id, {
          op: "comment_deleted",
          _id: comment_id,
        });
      }
    );
    return;
  } else if (op == "comment_updated") {
    var updated_comment = JSON.parse(req.body);

    fb_dbo.collection("comments").updateOne(
      { room_title: room_title, "comments_ar._id": updated_comment._id },
      {
        $set: { "comments_ar.$.message": updated_comment.message },
      },
      function (err, result) {
        //res.write(JSON.stringify(updated_comment));
        res.end();
        broadcast(room_title, browser_id, {
          op: "comment_updated",
          browser_id: browser_id,
          comment: updated_comment,
        });
      }
    );
    return;
  } else if (op == "get_verses") {
    tnc.handle_get_verses(JSON.parse(req.body), res);
    return;
  } else if (op == "first_request") {
    handle_first_http_request(req);
  } else {
    throw "op (" + op + ") not recognized.";
  }
  //
  res.end();
}

function handle_first_http_request(req) {
  var browser_id = req.query.browser_id;
  var room_title = req.query.title; // req.url == "/Monitor/" ? req.url :
  console.log(
    `got first Http request from room: \`${room_title}\` ${rAddr_to_ip(
      req.connection.remoteAddress
    )} browser_id: ${browser_id}`
  );
  if (ws_by_id[browser_id] != undefined) {
    ws_by_id[browser_id].room_title = room_title;
    if (browsers_ids_by_title[room_title] == undefined)
      browsers_ids_by_title[room_title] = {};
    browsers_ids_by_title[room_title][browser_id] = null;
  } else {
    // lilo: Warning..
  }
}

function rAddr_to_ip(ip_long) {
  var ip;
  var ip_res = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g.exec(ip_long);
  if (ip_res != null) {
    ip = ip_res[0];
  } else {
    ip = "127.0.0.1";
  }
  return ip;
}

function replace_html(req, data, title, description) {
  var html = data.replace(/\$OG_TITLE/g, title);
  html = html.replace(/\$OG_DESCRIPTION/g, description);
  html = html.replace(/\$OG_IMAGE/g, "/images/WC_Logo.png");
  html = html.replace(/\$LOCALHOST/g, req.headers.host);
  return html;
}
