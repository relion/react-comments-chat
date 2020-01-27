## React Advanced Comment

This is a simple fully working example, AWS compatible, Websockets based chat application written in Node.js and React.
Comments can be added, removed and edited all being reflected in real-time in all participant browsers using the same application URL.

### Installation

1.  Clone this repo and cd into it.
2.  Run `node app.js`
3.  Run `npm start`
4.  Use the link with a title: http://localhost/comments/?title=test_room
5.  Note: for testing the Notifications on real hostname, you can enable: Insecure origins treated as secure in chrome://flags/
    or simpliy right click here:

<img src="images/enable_notifications_in_chrome.png" title="Enable Notifications in Chrome">

## App snapshot

<img src="images/react_comments_room_snapshot.png" title="React Comments Room snapshot">

### Author

Aryeh Tuchfeld (relion)

based on [QCode.in](https://www.qcode.in/learn-react-by-creating-a-comment-app) tutorial.

### Keywords

chat, room, comments, solved, working, full-stack, react, node.js, websocket.

### Configure AWS WebSocekt

1. The WebSocket Server is set to port: 3030 (you can choose a differnt number).
2. See my video instructions on How to Configure the Node.js with WebSocket on AWS Elastic Beanstalk:

   [![](http://img.youtube.com/vi/E_-mBnRHsYc/0.jpg)](http://www.youtube.com/watch?v=E_-mBnRHsYc "Configuring Node.js Server with WebSocket on AWS Elastic Beanstalk")

## Live Demo

visit [this link](http://watchcastcomments-env.ij3bbu3yth.us-east-2.elasticbeanstalk.com/comments/?title=public_room).
