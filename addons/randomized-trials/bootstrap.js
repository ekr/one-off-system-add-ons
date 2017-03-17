/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

let {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Preferences.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/TelemetryController.jsm");
Cu.import("resource://gre/modules/ClientID.jsm");

Cu.importGlobalProperties(["crypto", "TextEncoder"]);
const DEBUG = true;
const SEED_PREF = "moz.randomness_trials.v1.seed";
const EXPERIMENTS = [
  {
    name: "exp1-enroll-all",
    enrollment: 1,
    pref: "dummy.pref.exp1-enroll-all",
    arms: [
      [ true, .5 ],
      [ false, .5 ]
    ]
  },
  {
    name: "exp2-enroll-none",
    enrollment: 0,
    pref: "dummy.pref.exp2-enroll-none",
    arms: [
      [ true, .5 ],
      [ false, .5 ]
    ]
  },
  {
    name: "exp3-enroll-second-arm",
    enrollment: 1,
    pref: "dummy.pref.exp3-enroll-all",
    arms: [
      [ true, .0001 ],
      [ false, .9999 ]
    ]
  }


];
    
let gStarted = false;
let gPrefs = new Preferences({ defaultBranch: true });
let gTimer;

function debug(msg) {
    if (DEBUG) {
        console.log(`RCT Addon: ${msg}`);
    }
}

function disable() {
  Experiments.instance().disableExperiment("FROM_API");
}

function toHex(arr) {
  let hexCodes = [];
  for (let i = 0; i < arr.length; ++i) {
    hexCodes.push(arr[i].toString(16).padStart(2, "0"));
  }

  return hexCodes.join("");
}

async function getRandomnessSeed() {
  return await ClientID.getClientID();
}

async function generateVariate(seed, label) {
  const hasher = crypto.subtle;
  const hash = await hasher.digest("SHA-256", new TextEncoder("utf-8").encode(seed + label));
  let view = new DataView(hash);
  return view.getUint32(0) / 0xffffffff;
}

async function determineExperiments(experiments) {
  let seed = await getRandomnessSeed();
  let config = {
    "seed" : seed,
    "experiments": []
  };

  let userprefs = new Preferences();

  for (let i in experiments) {
    let e = experiments[i];
    debug("Examining experiment " + e.name);
    if (userprefs.isSet(e.pref)) {
      debug("Preference " + e.pref + " already set. Skipping experiment " + e.name);
    }
    // Figure out if we are in the experiment.
    let v = await generateVariate(seed, e.name + "-enrollment");
    if (v >= e.enrollment) {
      continue;
    }
    debug("Enrolling in experiment " + e.name);

    // OK, we are in the experiment, now which arm.
    v = await generateVariate(seed, e.name + "-arm");

    let arm;
    let cum = 0;
    
    for (let a in e.arms) {
      cum += e.arms[a][1];
      if (v < cum) {
        arm = e.arms[a][0];
        break;
      }
    }

    if (arm === undefined) { 
      debug("Misconfigured experiment " + e.name + " skipping");
      continue;
    }

    debug("Selected arm="+arm);

    config.experiments.push({
      "name": e.name,
      "pref": e.pref,
      "arm": arm
    });
  }

  debug("Experimental config:" + JSON.stringify(config));
  
  // OK, now we should have the whole experimental setup.
  return config;
}

async function startup() {
  // Seems startup() function is launched twice after install, we're
  // unsure why so far. We only want it to run once.
  if (gStarted) {
    return;
  }

  debug("Installing");
  // Get the experimental config.
  let config = await determineExperiments(EXPERIMENTS);
    
  // TODO: Somehow store which branch I am in.
  
  // Now impose the experimental config.
  let prefs = new Preferences({ defaultBranch: true });
  for (let e in config.experiments) {
    prefs.set(config.experiments[e].pref, config.experiments[e].arm);
  }
}

function shutdown() {
  gStarted = false;
}

function install() {}
function uninstall() {}

