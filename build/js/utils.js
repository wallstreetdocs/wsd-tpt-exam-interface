// Winston-style logger function
WSD.logger = function ( type, message, data ) {

	// No console if no debug mode
	if ( !WSD.debug ) {
		return;
	}

	// Map console methods
	var method = 'log';
	switch ( type ) {
		case 'error':
		case 'info':
		case 'warn':
		case 'debug':
			method = type;
			break;
	}

	// Output
	/* eslint-disable no-console */
	if ( data ) {
		console[ method ] ( message, data );
	} else {
		console[ method ] ( message );
	}
	/* eslint-enable no-console */
};
