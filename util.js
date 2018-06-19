/*jslint node: true */
"use strict";

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}


exports.getRandomInt = getRandomInt;