if ( !window.WSD ) {
	window.WSD = {
		debug: true,
	}
}

window.WSD.certificationsIF = (function () {
	let _allExams;
	const _options = {};
	const _examsEndpoint = 'external/exams';
	const _directionNext = 'next';
	const _directionPrev = 'prev';
	const _inputAnswerName = 'wsd-answer';
	const _sessionStorageKey = 'wsd-answers';

	const _getHostnameUrl = function() {
		const hostnameURL = new URL ( _options.endpoint );
		return hostnameURL.protocol + '//' + hostnameURL.hostname + ':' + hostnameURL.port + '/';
	}

	const _getAnswersFromSession = function () {
		let storageObj = sessionStorage.getItem( _sessionStorageKey );
		let allAnswers;
		if ( storageObj ) {
			allAnswers = JSON.parse( storageObj );
		} else {
			allAnswers = [];
		}
		return allAnswers;
	};

	/**
	 * Given a level, return all question associated with it.
	 *
	 * @param thisLevel
	 * @returns {*}
	 * @private
	 */
	const _getQuestionsForExam = function( thisLevel ) {
		return _allExams.certificationQuestions.filter((entry) => {
			return entry.level === thisLevel;
		});
	};

	/**
	 * Given a collection of certifivcation levels (i.e. level 1,2,3),
	 * render each level.  But... check is we have a video first.
	 *
	 * We simply use the metadata in the level to show what's available.
	 *
	 * @param exams
	 * @returns {Promise<void>}
	 * @private
	 */
	const _renderExamList = async function ( ) {
		let output = '<div>';
		_allExams.certificationLevels.forEach ( ( level ) => {
			// if no video, don't show!
			if ( !level.video ) {
				return;
			}

			console.log ( level );

			let difficulty = 'Hard'; // default
			if ( level.name === 'Level 1' ) {
				difficulty = 'Easy'
			}
			if ( level.name === 'Level 2' ) {
				difficulty = 'Medium'
			}

			output += '<div>';
			output += '<div><h3>' + level.body.display_name + '</h3></div>';
			output += '<div><img src="' + level.image + '" /></div>';
			output += '<div class="small">Duration: ' + level.video_duration + ' (mins)</div>';
			output += '<div>' + level.description + '</div>';
			output += '<div>Difficulty: ' + difficulty + '</div>';
			output += '<div><a class="wsd-begin-test" href="' + level.body.url + '">Begin test </a></div>';
			output += '</div>';
		} );

		output += '</div>';

		document.querySelector ( _options.renderInto ).innerHTML = output;
		const beginTests = document.querySelectorAll ( '.wsd-begin-test' );

		// Hook into click event on each begin.retake test href.
		Array.from ( beginTests ).forEach ( link => {
			link.addEventListener ( 'click', ( event ) => {
				event.preventDefault ();
				const exam= new URL ( event.target.href );
				_showExam( exam.pathname );

			} );
		} );

	};

	/**
	 * Save the answer... Update session storage.
	 * @param answer
	 * @param sequence
	 * @private
	 */
	const _saveAnswer = function ( answer, sequence ) {
		debugger;
		const allAnswers = _getAnswersFromSession( );
		console.log( allAnswers );
		allAnswers[ sequence ] = answer;
		sessionStorage.setItem( _sessionStorageKey, JSON.stringify( allAnswers ) );
	};

	const _showExam = function ( exam) {
		// find exam.
		console.log( _allExams.certificationLevels );
		let thisExam;
		exam = exam.replace( '/', '' );

		for ( const item of _allExams.certificationLevels ) {
			if ( item.body.url === exam ) {
				thisExam = item;
				break;
			}
		}

		// thisExam is what we want to process.
		// NOTE: It will never be undefined since the list is populated from _allExams
		// exams are entities.. they only have a name.. not a specific level setting
		// this is why we have a naming convention of Level1,2,3,4,5 etc...
		const thisLevel = parseInt( exam.toLowerCase().replace( 'level-', '' ) );
		// now get questions from certification questions...
		const questions = _getQuestionsForExam( thisLevel );
		// now show questions.
		_showQuestions( questions );
	};

	/**
	 * Given a question object, render it.
	 *
	 * Format is:
	 *
	 * Question followed by Answers in Radio buttons...
	 *
	 * Prev and Next buttons... Prev is disabled if we're on question 1.
	 * Next changes to Finish if it's the last question
	 *
	 * @param question
	 * @private
	 */
	const _showQuestion = function( question, sequence, questionCount ) {
		return new Promise(( resolve, reject ) => {
			let output = '<div class="wsd-question-container">';
			output += '<div class="wsd-question-header">' + question.question +'</div>';
			output += '<div class="wsd-answer-container">';

			for ( let answerIndex = 0; answerIndex < question.options.length; answerIndex++ ) {
				output += '<div><input class="wsd-answer-radio" type="radio" name="' + _inputAnswerName + '" value="' + answerIndex + '" />' + question.options[ answerIndex ] + '</div>';
			}

			output += '</div>'; // end answer container

			// Buttons
			const prevDisabled = sequence === 0 ? 'disabled' : '';
			const nextText = ( sequence + 1 ) === questionCount ? 'Finish' : 'Next';

			output += '<div class="wsd-question-button-container">';
			output += '<button type="button" class="wsd-question-prev-button" ' + prevDisabled + ' >Previous question</button>';
			output += '<button type="button" class="wsd-question-next-button">' + nextText + '</button>';
			output += '</div>'; // end button container

			output += '</div>'; // end question container
			document.querySelector ( _options.renderInto ).innerHTML = output;

			// If we have an aswer in sesstion storage, set it
			const allAnswers = _getAnswersFromSession();
			if ( allAnswers[ sequence ] ) {
				debugger;
				// have an answer.. set value
				const allInput = document.getElementsByName( _inputAnswerName );
				allInput[ allAnswers[ sequence ] ].setAttribute('checked', true);
			}

			// now, hook into the prev, next buttons.
			document.querySelector('.wsd-question-next-button').addEventListener ( 'click', ( event ) => {
				event.preventDefault ();
				if ( document.querySelector('input[name="wsd-answer"]:checked') ) {
					const answer = document.querySelector ( 'input[name="wsd-answer"]:checked' ).value;
					resolve ( { answer, direction: _directionNext } );
				}
			} );

			// Note: can resolve without an answer since we're going back
			document.querySelector('.wsd-question-prev-button').addEventListener ( 'click', ( event ) => {
				event.preventDefault ();
				if ( document.querySelector('input[name="wsd-answer"]:checked') ) {
					const answer = document.querySelector ( 'input[name="wsd-answer"]:checked' ).value;
					return resolve ( { answer, direction: _directionPrev } );
				}
				resolve( { answer: null, direction: _directionPrev });
			} );

		});
	};

	const _showQuestions = async function( questions ) {
		questions.length = 3;
		let sequence = 0;
		while ( true ) {
			const response = await _showQuestion( questions[ sequence ], sequence, questions.length );
			console.log( response.answer, response.direction );
			if ( response.answer !== null ) {
				_saveAnswer( response.answer, sequence );
			}
			if ( response.direction === _directionNext ) {
				sequence++;
				if ( sequence === questions.length ) {
					break;
				}
			} else {
				sequence--;
			}
		}
		alert( 'done');

	}

	const _xhrGet = function ( url ) {
		return new Promise ( ( resolve, reject ) => {
			var xhttp = new XMLHttpRequest ();

			xhttp.onreadystatechange = function () {
				if ( this.readyState == 4 && this.status == 200 ) {
					resolve ( JSON.parse ( xhttp.responseText ) );
				}
			};

			xhttp.open ( "GET", url );
			xhttp.setRequestHeader ( 'Authorization', 'Bearer ' + _options.authToken );
			xhttp.send ();
		} );
	};

	// Public methods
	var certifications = {

		viewAllExams: async function () {
			// get all exams
			const exams = await _xhrGet ( _options.endpoint + _examsEndpoint );
			// render into a dom node
			_allExams = exams;
			_renderExamList( );
		},

		init: function ( options ) {
			console.log ( options );
			_options.authToken = options.authToken;
			_options.endpoint = options.endpoint.endsWith ( '/' ) ? options.endpoint : options.endpoint + '/';
			_options.renderInto = options.renderInto;

		}
	}

	return certifications;
}) ();

console.log ( window.WSD );
