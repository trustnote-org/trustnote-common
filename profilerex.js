/*jslint node: true */
"use strict";

var _				= require( 'lodash' );
var _fs          		= require( 'fs' );
var _desktop_app		= require( './desktop_app.js' );

var _sAppDataDir		= _desktop_app.getAppDataDir();

var _nProcessedUnitCount	= 0;
var _nProfilerExStart		= Date.now();
var _oData			= {};
var _oDefaultItem		= {
	count		: 0,
	time_first	: 0,
	time_last	: 0,
	time_start	: 0,
	time_used_total	: 0,
	time_used_avg	: 0,
	qps		: 0
};



/**
 *	@public
 */
function begin( sTag )
{
	//	...
	sTag	= String( sTag );

	if ( 0 === sTag.length )
	{
		throw Error( "profiler, ex, invalid tag " );
	}

	if ( ! _oData.hasOwnProperty( sTag ) )
	{
		_oData[ sTag ] = _.cloneDeep( _oDefaultItem );
		_oData[ sTag ].time_first	= Date.now();
	}

	//	...
	_oData[ sTag ].time_start	= Date.now();
}

/**
 *	@public
 */
function end( sTag )
{
	//	...
	sTag	= String( sTag );

	if ( 0 === sTag.length )
	{
		throw Error( "profiler, ex, invalid tag " );
	}

	if ( ! _oData.hasOwnProperty( sTag ) )
	{
		_oData[ sTag ]	= _.cloneDeep( _oDefaultItem );
		_oData[ sTag ].time_first	= Date.now();
		_oData[ sTag ].time_start	= Date.now();
	}

	//	...
	_oData[ sTag ].time_last	= Date.now();
	_oData[ sTag ].count ++;
	_oData[ sTag ].time_used_total	+= ( Date.now() - _oData[ sTag ].time_start );
	_oData[ sTag ].time_used_avg	= ( _oData[ sTag ].time_used_total / _oData[ sTag ].count ).toFixed( 2 );
	if ( _oData[ sTag ].time_used_total > 0 )
	{
		_oData[ sTag ].qps		= ( ( _oData[ sTag ].count * 1000 ) / _oData[ sTag ].time_used_total ).toFixed( 2 );
	}
	else
	{
		_oData[ sTag ].qps		= -1;
	}

}

/**
 *	@public
 */
function increase()
{
	_nProcessedUnitCount ++;
}


/**
 *	@public
 */
function print()
{
//	https://nodejs.org/api/fs.html#fs_fs_createwritestream_path_options
	var m_oWriteStream	= _fs.createWriteStream( _sAppDataDir + '/profiler-ex.txt', { flags: 'w' } );

	//	...
	m_oWriteStream.write( "\n############################################################\r\n" );
	m_oWriteStream.write( Date().toString() + "\r\n\r\n" );
	m_oWriteStream.write( JSON.stringify( _getSortedDataObject( _oData ), null, 4 ) );
	m_oWriteStream.write( JSON.stringify( _getSummary(), null, 4 ) );

	m_oWriteStream.end();
}






function _getSortedDataObject( oData )
{
	var arrDataList	= [];
	var sKey;
	var oNewObject;

	for ( sKey in oData )
	{
		if ( ! oData.hasOwnProperty( sKey ) )
		{
			continue;
		}

		//	...
		oNewObject	= oData[ sKey ];
		oNewObject.key	= sKey;
		oNewObject.qps	= parseFloat( oNewObject.qps );

		arrDataList.push( oNewObject );
	}

	arrDataList.sort
	(
		function( a, b )
		{
			return b.qps - a.qps;
		}
	);

	return arrDataList.filter
	(
		function ( oObject )
		{
			return oObject.qps >= 0;
		}
	)
	.reduce
	(
		function( oAcc, oCurrent )
		{
			oAcc[ oCurrent.key ]	= oCurrent;
			delete oAcc[ oCurrent.key ].key;

			//	...
			return oAcc;
		},
		{}
	);
}

function _getSummary()
{
	var arrDataList;
	var nTotalTimeUsed;
	var nTotalTimeUnitProcess;
	var nTotalExecutedCount;
	var nAverageNormalQps;
	var nAverageUnitProcessQps;

	//	...
	arrDataList		= Object.values( _oData );
	nTotalTimeUsed		= 0;
	nTotalExecutedCount	= 0;

	if ( Array.isArray( arrDataList ) && arrDataList.length > 0 )
	{
		nTotalTimeUsed		= arrDataList.reduce
		(
			function( nAccumulator, oCurrentValue )
			{
				return parseInt( nAccumulator ) + parseInt( oCurrentValue.time_used_total );
			},
			arrDataList[ 0 ].time_used_total
		);
		nTotalExecutedCount	= arrDataList.reduce
		(
			function( nAccumulator, oCurrentValue )
			{
				return parseInt( nAccumulator ) + parseInt( oCurrentValue.count );
			},
			arrDataList[ 0 ].count
		);
	}

	//	...
	nTotalTimeUnitProcess	= 0;

	if ( nTotalTimeUsed > 0 )
	{
		nAverageNormalQps	= ( ( nTotalExecutedCount * 1000 ) / nTotalTimeUsed ).toFixed( 2 );

		//
		//	...
		//
		//nTotalTimeUnitProcess	+= _oData.hasOwnProperty( '#updateMainChain' ) ? _oData[ '#updateMainChain' ].time_used_total : 0;
		//nTotalTimeUnitProcess	+= _oData.hasOwnProperty( '#validate' ) ? _oData[ '#validate' ].time_used_total : 0;
		nTotalTimeUnitProcess	+= _oData.hasOwnProperty( '#saveJoint' ) ? _oData[ '#saveJoint' ].time_used_total : 0;
		nAverageUnitProcessQps	= ( ( _nProcessedUnitCount * 1000 ) / nTotalTimeUnitProcess ).toFixed( 2 );
	}
	else
	{
		nAverageNormalQps	= -1;
		nAverageUnitProcessQps	= -1;
	}

	//	...
	return {
		"time_start"				: _nProfilerExStart,
		"time_end"				: Date.now(),
		"time_elapsed"				: Date.now() - _nProfilerExStart,
		"time_used_total"			: nTotalTimeUsed,
		"count_executed"			: nTotalExecutedCount,
		"average_normal_qps"			: nAverageNormalQps,
		"units"	: {
			"time_used_total_processed_units"	: nTotalTimeUnitProcess,
			"count_processed_units"			: _nProcessedUnitCount,
			"average_unit_process_qps"		: nAverageUnitProcessQps
		}
	};
}

function _printResults()
{
	console.log( JSON.stringify( _getSummary(), null, 4 ) );
}




/**
 *	ON SIGINT
 */
process.on
(
	'SIGINT',
	function()
	{
		console.log( "profilerex :: received sigint" );

		//	print();
		_printResults();

		//	...
		process.exit();
	}
);




/**
 *	print profiler every 5 seconds
 */
setInterval
(
	function ()
	{
		print();
	},
	3 * 1000
);


/**
 *	exports
 */
exports.begin		= begin;	//	function(){};
exports.end		= end;		//	function(){};
exports.increase	= increase;	//	function(){};
exports.print		= print;
