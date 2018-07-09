// if unit is undefined, find units that are ready
function handleSavedPrivatePayments( unit )
{
	//if (unit && assocUnitsInWork[unit])
	//    return;
	mutex.lock
	(
		[
			"saved_private"
		],
		function( unlock )
		{
			var sql = unit
				? "SELECT json, peer, unit, message_index, output_index, linked FROM unhandled_private_payments WHERE unit="+db.escape(unit)
				: "SELECT json, peer, unit, message_index, output_index, linked FROM unhandled_private_payments CROSS JOIN units USING(unit)";

			db.query
			(
				sql,
				function( rows )
				{
					if ( rows.length === 0 )
						return unlock();

					var assocNewUnits = {};
					async.each
					(
						//	handle different chains in parallel
						rows,
						function( row, cb )
						{
							var arrPrivateElements = JSON.parse(row.json);
							var ws = getPeerWebSocket( row.peer );

							if ( ws && ws.readyState !== ws.OPEN )
								ws = null;

							var validateAndSave = function()
							{
								var objHeadPrivateElement = arrPrivateElements[0];
						var payload_hash = objectHash.getBase64Hash(objHeadPrivateElement.payload);
						var key = 'private_payment_validated-'+objHeadPrivateElement.unit+'-'+payload_hash+'-'+row.output_index;
						privatePayment.validateAndSavePrivatePaymentChain(arrPrivateElements, {
							ifOk: function()
							{
								if (ws)
									sendResult(ws, {private_payment_in_unit: row.unit, result: 'accepted'});
								if (row.peer) // received directly from a peer, not through the hub
									eventBus.emit("new_direct_private_chains", [arrPrivateElements]);
								assocNewUnits[row.unit] = true;
								deleteHandledPrivateChain(row.unit, row.message_index, row.output_index, cb);
								console.log('emit '+key);
								eventBus.emit(key, true);
							},
							ifError: function(error){
								console.log("validation of priv: "+error);
								//	throw Error(error);
								if (ws)
									sendResult(ws, {private_payment_in_unit: row.unit, result: 'error', error: error});
								deleteHandledPrivateChain(row.unit, row.message_index, row.output_index, cb);
								eventBus.emit(key, false);
							},
							// light only. Means that chain joints (excluding the head) not downloaded yet or not stable yet
							ifWaitingForChain: function(){
								cb();
							}
						});
					};

					if (conf.bLight && arrPrivateElements.length > 1 && !row.linked)
						updateLinkProofsOfPrivateChain(arrPrivateElements, row.unit, row.message_index, row.output_index, cb, validateAndSave);
					else
						validateAndSave();

				},
				function()
				{
					unlock();
					var arrNewUnits = Object.keys(assocNewUnits);
					if (arrNewUnits.length > 0)
						eventBus.emit("new_my_transactions", arrNewUnits);
				}
					);
				}
			);
		}
	);
}