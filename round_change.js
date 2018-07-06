/*jslint node: true */
"use strict";

var eventBus = require('./event_bus.js');
var db = require('./db.js');
var constants = require('./constants.js');
require('./enforce_singleton.js');
var async = require('async');

eventBus.on('mci_became_stable', updateSuperGrp);

function updateSuperGrp(mci) {
	console.info("mainchain advance to", mci);
	db.query("select rnd_num,address from units join equihash using(unit) where main_chain_index=? order by units.level,units.unit limit ?", [mci, constants.COUNT_WITNESSES], function (rows) {
		if (rows.length === 0)
			return;
		async.eachSeries(rows,
			function (row, cb) {
				if (row.rnd_num > global.nxtRnd) {
					insertAttestor(mci);
					global.curRnd = row.rnd_num - 1;
					global.nxtRnd = row.rnd_num;
					global.nxtSuperGrp = [];
					global.curSuperGrp = [];
					global.nxtSuperGrp.push(row.address);
				} else if (row.rnd_num === global.nxtRnd) {
					// if (global.nxtSuperGrp.indexOf(row.address) < 0) {
						global.nxtSuperGrp.push(row.address);
						if (global.nxtSuperGrp.length === constants.COUNT_WITNESSES) {
							let bInCurSuperGrp=global.curSuperGrp.indexOf(row.address) >-1;
							let bInNxtSuperGrp=global.nxtSuperGrp.indexOf(row.address) > -1;
							console.info("round change from %d to %d", global.curRnd, global.nxtRnd);
							insertAttestor(mci);
							global.curSuperGrp = global.nxtSuperGrp;
							global.nxtSuperGrp = [];
							let curRnd=global.curRnd;
							let nxtRnd=global.nxtRnd;
                            global.curRnd = global.nxtRnd++;
                            eventBus.emit("round_change",curRnd,nxtRnd,bInCurSuperGrp,bInNxtSuperGrp);
						}
					// }
				}
				cb();
			},
			function (err) {
				if (err)
					console.log(err);
			}
		);
	});
}

function insertAttestor( mci) {
	for (var i = 0; i < global.curSuperGrp.length; i++) {
		db.query("insert into attestor values(?,?,?)", [global.curRnd, global.curSuperGrp[i], mci]);
	}
}