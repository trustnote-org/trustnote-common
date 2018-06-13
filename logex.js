/*jslint node: true */
"use strict";

var _			= require( 'lodash' );
var _fs			= require( 'fs' );
var _util		= require( 'util' );
var _desktop_app	= require( './desktop_app.js' );
var _conf		= require( './conf.js' );


/**
 *	variables of this module
 */
var _sAppDataDir	= _desktop_app.getAppDataDir();
var _sLogFilename	= _conf.LOG_FILENAME || ( _sAppDataDir + '/log.txt' );
var _cWriteStream	= _fs.createWriteStream( _sLogFilename, { flags : "a" } );

var _cDoubleArrayCache	= new CDoubleArrayCache();
var _nInterval		= null;




/**
 *	class CDoubleArrayCache
 *	@class
 */
function CDoubleArrayCache()
{
	var m_oThis		= this;

	var m_nIndex		= 0;
	var m_arrData		= [ [], [] ];
	var m_arrEntryOnline	= null;
	var m_arrEntryOffline	= null;



	/**
	 *	push data
	 *
	 *	@param	oObj
	 */
	this.push = function( oObj )
	{
		m_arrEntryOnline.push( oObj );
	};

	/**
	 *	extract list from offline slot and then clear them
	 *
	 *	@param	pfnCallback
	 *	@returns {*}
	 */
	this.extract = function( pfnCallback )
	{
		if ( 'function' === typeof pfnCallback )
		{
			return _extractByCallback( pfnCallback );
		}
		else
		{
			return _extractByClone();
		}
	};


	////////////////////////////////////////////////////////////////////////////////
	//	Private
	//


	/**
	 *	@private
	 */
	function _constructor()
	{
		m_nIndex	= 0;
		m_arrData	= [ [], [] ];

		//
		//	initialize cache list for the first time
		//
		_switch();
	}

	/**
	 *	@private
	 */
	function _switch()
	{
		//
		//	just go ...
		//
		m_nIndex ++;

		//
		//	switch slots/pointers between online and offline
		//
		m_arrEntryOnline	= m_arrData[ _getOnlineIndex() ];
		m_arrEntryOffline	= m_arrData[ _getOfflineIndex() ];
	}

	/**
	 *	@private
	 */
	function _getOnlineIndex()
	{
		return m_nIndex % 2;
	}

	/**
	 *	@private
	 */
	function _getOfflineIndex()
	{
		return ( m_nIndex + 1 ) % 2;
	}

	/**
	 *	@private
	 *	@returns {*}
	 */
	function _extractByClone()
	{
		var arrRet;

		//
		//	deep clone array
		//
		arrRet	= _.cloneDeep( m_arrEntryOffline );

		//	clear array in slot offline
		_clearOfflineSlot();

		//	switch offline to online
		_switch();

		//	...
		return arrRet;
	}

	/**
	 *	@private
	 *	@param	pfnCallback
	 *	@returns {boolean}
	 */
	function _extractByCallback( pfnCallback )
	{
		//
		//	call back to send data by cloning
		//
		pfnCallback( _.cloneDeep( m_arrEntryOffline ) );

		//	clear array in slot offline
		_clearOfflineSlot();

		//	switch offline to online
		_switch();

		//	...
		return true;
	}

	/**
	 *	@private
	 */
	function _clearOfflineSlot()
	{
		var nIndex;

		//	...
		nIndex	= _getOfflineIndex();

		//	...
		m_arrData[ nIndex ].splice( 0, m_arrData[ nIndex ].length );
		m_arrData[ nIndex ]	= [];
	}



	//	...
	_constructor();
}



/**
 *	push
 */
function push()
{
	//
	//	just push, push ...
	//
	return _cDoubleArrayCache.push
	(
		{
			tm	: new Date(),
			args	: arguments
		}
	);
}


function _flush()
{
	var arrLogList;

	//
	//	extract logs
	//
	arrLogList = _cDoubleArrayCache.extract();

	//	...
	if ( Array.isArray( arrLogList ) && arrLogList.length > 0 )
	{
		var sLogsChunkToWrite = "";
		arrLogList.forEach(function ( oItem )
		{
			sLogsChunkToWrite += oItem.tm.toString() + ": " + _util.format( oItem.args ) + "\n"
		});
		_cWriteStream.write( sLogsChunkToWrite );
	}
}

function _handleProcessExit()
{
	clearInterval( _nInterval );
	_nInterval	= null;

	//
	//	call flush
	//
	_flush();
	_flush();

	//	...
	console.log( "logex :: received sigint" );
	process.exit();
}




/**
 *	start a interval
 */
_nInterval = setInterval
(
	_flush,
	3 * 1000
);


/**
 *	handle while process exiting
 */
process.on
(
	'SIGINT',
	_handleProcessExit
);


/**
 *	exports
 */
exports.CDoubleArrayCache	= CDoubleArrayCache;
exports.push			= push;