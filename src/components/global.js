import queryString from "query-string";

global.host = window.location.hostname; // "testcomments5-env.vip8dhubmp.us-west-2.elasticbeanstalk.com";
//alert(host);
var port = ""; // ":8080";
global.server_url = "http://" + global.host + port + "/handle_comments/"; // "http://www.thevcard.net/cms/cms_json.aspx";

function handle_win_title() {
  var title_arg = window.location.search;
  if (title_arg !== "") title_arg = title_arg.substr(1) + "&";
  window.location.title_arg = title_arg;
  global.title = queryString.parse(window.location.search).title;
  if (global.title === undefined || global.title === "") {
    global.title = "Root";
  }
}

export default handle_win_title;
