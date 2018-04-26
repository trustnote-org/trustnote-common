/*jslint node: true */
"use strict";
var db = require('./db.js');
var constants = require("./constants.js");
var conf = require("./conf.js");
var storage = require("./storage.js");
var main_chain = require("./main_chain.js");


function pickParentUnits(conn,  onDone){
	// don't exclude units derived from unwitnessed potentially bad units! It is not their blame and can cause a split.
	
	// test creating bad units
	//var cond = bDeep ? "is_on_main_chain=1" : "is_free=0 AND main_chain_index=1420";
	//var order_and_limit = bDeep ? "ORDER BY main_chain_index DESC LIMIT 1" : "ORDER BY unit LIMIT 1";
	
	conn.query(
		"SELECT \n\
			unit, version, alt \n\
		FROM units "+(conf.storage === 'sqlite' ? "INDEXED BY byFree" : "")+" \n\
		LEFT JOIN archived_joints USING(unit) \n\
		WHERE +sequence='good' AND is_free=1 AND archived_joints.unit IS NULL ORDER BY unit LIMIT ?", 
		// exclude potential parents that were archived and then received again
		[constants.MAX_PARENTS_PER_UNIT], 
		function(rows){
			if (rows.some(function(row){ return (row.version !== constants.version || row.alt !== constants.alt); }))
				throw Error('wrong network');
			//dag的任意时刻，应该都有叶子节点,此行应该也可以注掉
			if(rows.length===0)
				return pickDeepParentUnits(conn,   onDone);
			var arrParentUnits = rows.map(function(row){ return row.unit; });
			onDone(null, arrParentUnits.slice(0, constants.MAX_PARENTS_PER_UNIT));
		}
	);
}

// if we failed to find compatible parents among free units. 
// (This may be the case if an attacker floods the network trying to shift the witness list)
function pickDeepParentUnits(conn, onDone){
	// fixed: an attacker could cover all free compatible units with his own incompatible ones, then those that were not on MC will be never included
	//var cond = bDeep ? "is_on_main_chain=1" : "is_free=1";
	
	conn.query(
		"SELECT unit \n\
		FROM units \n\
		WHERE +sequence='good' \n\
		ORDER BY main_chain_index DESC LIMIT 1", 
		function(rows){
			if (rows.length === 0)
				return onDone("failed to find compatible parents: no deep units");
			onDone(null, rows.map(function(row){ return row.unit; }));
		}
	);
}

function findLastStableMcBall(conn,  onDone){
	conn.query(
		"SELECT ball, unit, main_chain_index FROM units JOIN balls USING(unit) \n\
		WHERE is_on_main_chain=1 AND is_stable=1 AND +sequence='good' \n\
		ORDER BY main_chain_index DESC LIMIT 1", 
		function(rows){
			if (rows.length === 0)
				return onDone("failed to find last stable ball");
			onDone(null, rows[0].ball, rows[0].unit, rows[0].main_chain_index);
		}
	);
}

function adjustLastStableMcBallAndParents(conn, last_stable_mc_ball_unit, arrParentUnits,  handleAdjustedLastStableUnit){
	main_chain.determineIfStableInLaterUnits(conn, last_stable_mc_ball_unit, arrParentUnits, function(bStable){
		if (bStable){
			conn.query("SELECT ball, main_chain_index FROM units JOIN balls USING(unit) WHERE unit=?", [last_stable_mc_ball_unit], function(rows){
				if (rows.length !== 1)
					throw Error("not 1 ball by unit "+last_stable_mc_ball_unit);
				var row = rows[0];
				handleAdjustedLastStableUnit(row.ball, last_stable_mc_ball_unit, row.main_chain_index, arrParentUnits);
			});
			return;
		}
		console.log('will adjust last stable ball because '+last_stable_mc_ball_unit+' is not stable in view of parents '+arrParentUnits.join(', '));
		if (arrParentUnits.length > 1){ // select only one parent
			pickDeepParentUnits(conn,  function(err, arrAdjustedParentUnits){
				if (err)
					throw Error("pickDeepParentUnits in adjust failed: "+err);
				adjustLastStableMcBallAndParents(conn, last_stable_mc_ball_unit, arrAdjustedParentUnits,  handleAdjustedLastStableUnit);
			});
			return;
		}
		storage.readStaticUnitProps(conn, last_stable_mc_ball_unit, function(objUnitProps){
			if (!objUnitProps.best_parent_unit)
				throw Error("no best parent of "+last_stable_mc_ball_unit);
			adjustLastStableMcBallAndParents(conn, objUnitProps.best_parent_unit, arrParentUnits,  handleAdjustedLastStableUnit);
		});
	});
}

function trimParentList(conn, arrParentUnits,  handleTrimmedList){
	if (arrParentUnits.length <= constants.MAX_PARENTS_PER_UNIT)
		return handleTrimmedList(arrParentUnits);
	conn.query(
		"SELECT unit, (SELECT 1 FROM trustme WHERE trustme.unit=units.unit LIMIT 1) AS is_attestor \n\
		FROM units WHERE unit IN("+arrParentUnits.map(db.escape).join(', ')+") ORDER BY is_attestor DESC, "+db.getRandom()+" LIMIT ?",
		[constants.MAX_PARENTS_PER_UNIT],
		function(rows){
			handleTrimmedList(rows.map(function(row){ return row.unit; }).sort());
		}
	);
}

function pickParentUnitsAndLastBall(conn,  onDone){
	pickParentUnits(conn,  function(err, arrParentUnits){
		if (err)
			return onDone(err);
		findLastStableMcBall(conn,  function(err, last_stable_mc_ball, last_stable_mc_ball_unit, last_stable_mc_ball_mci){
			if (err)
				return onDone(err);
			adjustLastStableMcBallAndParents(
				conn, last_stable_mc_ball_unit, arrParentUnits,  
				function(last_stable_ball, last_stable_unit, last_stable_mci, arrAdjustedParentUnits){
					trimParentList(conn, arrAdjustedParentUnits,  function(arrTrimmedParentUnits){
						onDone(null, arrTrimmedParentUnits, last_stable_ball, last_stable_unit, last_stable_mci);
					});
				}
			);
		});
	});
}

exports.pickParentUnitsAndLastBall = pickParentUnitsAndLastBall;
