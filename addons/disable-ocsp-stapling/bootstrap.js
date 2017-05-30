/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

let {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Preferences.jsm");

const PREF = "security.ssl.enable_ocsp_stapling";
let gStarted = false;

async function startup(data, reason) {
  // Don't do anything if the user has already messed with this
  // setting.
  let userprefs = new Preferences();
  if (userprefs.isSet(PREF)) {
    console.log("User has modified OCSP stapling. Skipping");
    return;
  }
  
  // Seems startup() function is launched twice after install, we're
  // unsure why so far. We only want it to run once.
  if (gStarted) {
    return;
  }

  let prefs = new Preferences({ defaultBranch: true });
  prefs.set(PREF, false);
}

function shutdown() {
  gStarted = false;
}

function install() {}
function uninstall() {}

