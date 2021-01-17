import React, { Component } from "react";

class PlayAudio {
  constructor(app) {
    this.app = app;
  }

  // chrome://settings/content/notifications
  // Note: for testing the Notifications on real host, you can enable: Insecure origins treated as secure in chrome://flags/
  get_notifications_permission() {
    if (window.Notification && Notification.permission !== "granted") {
      Notification.requestPermission(function (status) {
        if (Notification.permission !== "granted") {
          alert("Notification.permission was NOT granted.");
        }
      }, this.app);
    }
  }

  check_playAudio() {
    try {
      var audio = new Audio("/audio/chimes.mp3");
      audio.app = this.app;
      audio.onerror = function () {
        console.log("Can't play audio");
      };
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(function () {
            this.app.setState({ show_permit_button: false });
          })
          .catch(function (error) {
            // need to click a button to enable audio.
          });
      }
    } catch (e) {
      console.log("Can't play audio");
    }
  }

  handleUserPermitClick() {
    new Audio("/audio/chimes.mp3").play();
    this.setState({ show_permit_button: true });
  }
}

export default PlayAudio;
