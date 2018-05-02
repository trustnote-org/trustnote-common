"use strict";
var constants = require("./constants.js");

if (global._bTrustnoteCoreLoaded)
	throw Error("Looks like you are loading multiple copies of trustnote-common, which is not supported.\nRunnung 'npm dedupe' might help.");

global._bTrustnoteCoreLoaded = true;


global.curRnd=0;
global.nxtRnd=1;
global.curSuperGrp=[];
global.nxtSuperGrp=[];

global.solution;

global.trustme_interval;
