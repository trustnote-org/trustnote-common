/*jslint node: true */
"use strict";

var _			= require( 'lodash' );
var _fs			= require( 'fs' );
var _util		= require( 'util' );
var _desktop_app = require('trustnote-common/desktop_app.js');
var _conf		= require( './conf.js' );

var m_sAppDataDir	= _desktop_app.getAppDataDir();
var m_sLogFilename	= _conf.LOG_FILENAME || ( m_sAppDataDir + '/logex.txt' );
var m_cWriteStream	= _fs.createWriteStream( m_sLogFilename, { flags : "a" } );

var m_cDoubleArrayCache	= new CDoubleArrayCache();
var m_nInterval		= null;




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
	return m_cDoubleArrayCache.push
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
	var i;
	var oItem;

	//
	//	extract logs
	//
	arrLogList = m_cDoubleArrayCache.extract();

	//	...
	if ( Array.isArray( arrLogList ) && arrLogList.length > 0 )
	{
		var LogsChunkToWrite = "";
		arrLogList.forEach(function (item){
			LogsChunkToWrite += item.tm.toString() + ": " + _util.format( item.args ) + "\n"
		});
		m_cWriteStream.write(LogsChunkToWrite);
	}
}

function _handleProcessExit()
{
	clearInterval( m_nInterval );
	m_nInterval	= null;

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
m_nInterval = setInterval
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