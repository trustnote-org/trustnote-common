/*jslint node: true */
"use strict";

if (global._bTrustgraphCoreLoaded)
	throw Error("Looks like you are loading multiple copies of trustgraph-common, which is not supported.\nRunnung 'npm dedupe' might help.");

global._bTrustgraphCoreLoaded = true;
