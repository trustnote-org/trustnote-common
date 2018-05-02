"use strict";

var process=require('process'); 
var composer=require('./composer.js');
var network = require('./network.js');
var conf=require('./conf.js');
const headlessWallet = require('trustnote-headless');

function postTrustme(rndNum,solution) {
    console.info("start to post trustme unit for round",rndNum);
    
    var callbacks = composer.getSavingCallbacks({
        ifNotEnoughFunds: function(err) {
            console.error(err);
        },
        ifError: function(err) {
            console.error(err);
        },
        ifOk: function(objJoint) {
            network.broadcastJoint(objJoint);
        }
    });

    let readSingleAddress = conf.bSingleAddress ? headlessWallet.readSingleAddress : headlessWallet.readFirstAddress;
	readSingleAddress(function(address){
        composer.composeTrustmeJoint(address, rndNum,solution, headlessWallet.signer, callbacks);
    });
}

exports.postTrustme=postTrustme