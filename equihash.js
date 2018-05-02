'use strict';
var conf=require('./conf.js');
var headlessWallet = require('trustnote-headless');
var blake2 = require('blake2');
var composer=require('./composer.js');
var network=require('./network.js');
var trustme=require('./trustme.js');

function onError(err){
    console.error(err);
}

function startEquihash(address,nxtRndNum){
    console.info("start equihash for",nxtRndNum);
    global.solution=genSolution(address);
    composer.composeEquihashJoint(address,nxtRndNum,"I'm seed",100,global.solution,headlessWallet.signer,composer.getSavingCallbacks({
        ifNotEnoughFunds: onError,
        ifError: onError,
        ifOk: function(objJoint){
            process.nextTick(network.broadcastJoint,objJoint);
        }
    }));
}

function genSolution(address){
    var h = blake2.createHash('blake2b', {digestLength: 16});
    h.update(new Buffer(address));
    var solution=h.digest().toString(); 
    return solution;
}

exports.startEquihash=startEquihash