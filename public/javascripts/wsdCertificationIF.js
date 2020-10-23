if ( !window.WSD ) {
	window.WSD = {
		debug: true,
	}
}

window.WSD.certificationsIF = (function () {
	let _allExams = null;
	const _options = {};
	const _answersEndpoint = 'external/exams/answers/';
	var _buttonCorrectClass = 'wsd-button-correct';
	var _buttonIncorrectClass = 'wsd-button-incorrect';
	let _examAnsweredCorrectly = 0;
	var _examTitle;
	const _examsEndpoint = 'external/exams';
	const _directionNext = 'next';
	const _directionPrev = 'prev';
	var _gridButtonContainer;
	const _inputAnswerName = 'wsd-answer';
	let _isReview = false;  // flag to control review mode
	const _retakeButton = 'wsd-retake-button';
	const _reviewButton = 'wsd-review-button';
	var _serverAnswers;
	const _sessionStorageKey = 'wsd-answers';
	let _thisExam = null;   // current exam being taken. (/level-1...)
	var _thisLevel;    // the level that is being taken
	let _userAnswers;

	/**
	 * Helper to return hostname
	 *
	 * @returns {string}
	 * @private
	 */
	const _getHostnameUrl = function () {
		const hostnameURL = new URL ( _options.endpoint );
		return hostnameURL.protocol + '//' + hostnameURL.hostname + ':' + hostnameURL.port + '/';
	}

	/**
	 * Get the answers from our server.  Called at the end of the exam
	 *
	 * @param level
	 * @returns {Promise<unknown>}
	 * @private
	 */
	const _getAnswersFromServer = function ( level ) {
		return _xhrGet ( _getHostnameUrl () + _answersEndpoint + level );
	};

	/**
	 * All user answers are stored in sessionStorage.  Return them.
	 *
	 * @returns {*[]}
	 * @private
	 */
	const _getAnswersFromSession = function () {
		let storageObj = sessionStorage.getItem ( _sessionStorageKey );
		let allAnswers;
		if ( storageObj ) {
			allAnswers = JSON.parse ( storageObj );
		} else {
			allAnswers = [];
		}
		return allAnswers;
	};

	/**
	 * Get the correct answer to a particular question.
	 *
	 * @param answers
	 * @param id
	 * @returns {[null, null]}
	 * @private
	 */
	const _getAnswerToQuestion = function ( answers, id ) {
		let rightAnswer = null;
		let answerInfo = null;
		for ( const answer of answers ) {
			if ( answer.id === id ) {
				rightAnswer = answer.answer;
				answerInfo = answer.answer_info;
				break;
			}
		}
		return [rightAnswer, answerInfo];
	};

	/**
	 * Given a level, return all question associated with it.
	 *
	 * @param thisLevel
	 * @returns {*}
	 * @private
	 */
	const _getQuestionsForExam = function ( thisLevel ) {
		return _allExams.certificationQuestions.filter ( ( entry ) => {
			return entry.level === thisLevel;
		} );
	};

	const _isCorrectAnswer = function( sequence, answerIndex ) {
		let serverAnswer = _serverAnswers[ sequence ];
		if ( serverAnswer.answer === answerIndex ) {
			// return.. this is the correct answer   don't flag
			return 'wsd-answer-info'
		}
		var allAnswers = _getAnswersFromSession ()[ sequence ];
		if ( allAnswers.answer === answerIndex ) {
			// here's our incorrect answer
			return 'wsd-incorrect-answer';
		}
		return '';
	};

	/**
	 * Called when finished...
	 *
	 * Augment original questions with the answer and the answer info. and call showResults
	 *
	 * @param level
	 * @returns {Promise<void>}
	 * @private
	 */
	const _processAnswers = async function ( level ) {
		_serverAnswers = await _getAnswersFromServer ( level );
		// match questions to answer via their id.
		_userAnswers = _getAnswersFromSession ();
		_examAnsweredCorrectly = 0;
		for ( let i = 0; i < _userAnswers.length; i++ ) {
			const answer = _userAnswers[ i ];
			// find this id in server answers
			const [rightAnswer, answerInfo] = _getAnswerToQuestion ( _serverAnswers, answer.id );
			answer.answerInfo = answerInfo;
			answer.isCorrect = rightAnswer === answer.answer;
			if ( answer.isCorrect ) {
				_examAnsweredCorrectly++;
			}
		}
		_showResult (  );
	};

	/**
	 * Given a collection of certification levels (i.e. level 1,2,3),
	 * render each level.  But... check if we have a video first.
	 *
	 * We simply use the metadata in the level to show what's available.
	 *
	 * @param exams
	 * @returns {Promise<void>}
	 * @private
	 */
	const _renderExamList = async function () {
		let output = '<div class="wsd-page">';
		_allExams.certificationLevels.forEach ( ( level ) => {
			// if no video, don't show!
			if ( !level.video ) {
				return;
			}

			let difficulty = 'Hard'; // default
			if ( level.name === 'Level 1' ) {
				difficulty = 'Easy'
			}
			if ( level.name === 'Level 2' ) {
				difficulty = 'Medium'
			}

			output += '<div class="wsd-exam-container">';
			output += '<div class="wsd-exam-title">' + level.body.display_name + '</div>';
			output += '<div class="wsd-exam-image"><img src="' + level.image + '" /></div>';
			output += '<div class="wsd-exam-video-duration">Duration: ' + level.video_duration + ' (mins)</div>';
			output += '<div class="wsd-exam-description">' + level.description + '</div>';
			output += '<div classs="wsd-exam-difficulty">Difficulty: ' + difficulty + '</div>';
			output += '<div><a class="wsd-begin-test" href="' + level.body.url + '">Begin test &rarr;</a></div>';
			output += '</div>';
		} );

		output += '</div>';

		document.querySelector ( _options.renderInto ).innerHTML = output;
		const beginTests = document.querySelectorAll ( '.wsd-begin-test' );

		// Hook into click event on each begin.retake test href.
		Array.from ( beginTests ).forEach ( link => {
			link.addEventListener ( 'click', ( event ) => {
				event.preventDefault ();
				const exam = new URL ( event.target.href );
				_thisExam = exam.pathname;
				_showExam ( _thisExam );
			} );
		} );

	};

	/**
	 * Save the answer... Update session storage.
	 *
	 * @param answer
	 * @param sequence
	 * @private
	 */
	const _saveAnswer = function ( answer, sequence, id ) {
		const allAnswers = _getAnswersFromSession ();
		allAnswers[ sequence ] = { answer, id };
		sessionStorage.setItem ( _sessionStorageKey, JSON.stringify ( allAnswers ) );
	};

	/**
	 * When we are in review mode, show a grid of answers that are marked
	 * correct, or incorrect.
	 */
	const _showAnswerGrid = function ( ) {
		var output = '<div class="' + _gridButtonContainer + '">';
		for ( var i = 0; i < _userAnswers.length; i++ ) {
			console.log( i, _userAnswers[ i ].isCorrect );
			var buttonText = _userAnswers[ i ].isCorrect  ? '&check;' : '&#x2A09;';
			var buttonClass = _userAnswers[ i ].isCorrect ? _buttonCorrectClass : _buttonIncorrectClass;
			output += '<span class="wsd-grid-button '
				+ buttonClass
				+ '">'
				+ (i+1)
				+ '</span>'
				+ buttonText;
		}
		output += '</div>';
		return output;
	};

	const _showAnswerGridHook = function() {
		// hook into button so we can go directly to that question.
		const gridButtons = document.querySelectorAll ( '.wsd-grid-button' );
		console.log( gridButtons );
		// Hook into click event on each button
		Array.from ( gridButtons ).forEach ( link => {
			link.addEventListener ( 'click', ( event ) => {
				event.preventDefault ();
				var sequence = parseInt( event.target.innerHTML  ) - 1;
				var questions = _getQuestionsForExam( _thisLevel );
				_showQuestions( questions, _thisLevel, sequence );
			} );
		} );

	}

	/**
	 *
	 * Show exam... In particular, iterate thru the questions and call
	 * showQuestions which will return a promise.  The promise will inform
	 * this function on what to do next...  forward, back...etc.
	 *
	 * @param exam
	 * @private
	 */
	const _showExam = function ( exam ) {
		// find exam.
		let thisExam;
		exam = exam.replace ( '/', '' );

		for ( const item of _allExams.certificationLevels ) {
			if ( item.body.url === exam ) {
				thisExam = item;
				break;
			}
		}

		_examTitle = thisExam.body.display_name;

		// thisExam is what we want to process.
		// NOTE: It will never be undefined since the list is populated from _allExams
		// exams are entities.. they only have a name.. not a specific level setting
		// this is why we have a naming convention of Level1,2,3,4,5 etc...
		_thisLevel = parseInt ( exam.toLowerCase ().replace ( 'level-', '' ) );
		// now get questions from certification questions...
		const questions = _getQuestionsForExam ( _thisLevel );
		// now show questions.
		_showQuestions ( questions, _thisLevel );
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
	const _showQuestion = function ( question, sequence, questionCount ) {
		return new Promise ( ( resolve, reject ) => {
			let output = '<div class="wsd-question-container">';

			output += '<div class="wsd-exam-title">' + _examTitle +'</div>';
			output += '<div class="wsd-question-header">Q'+ (sequence +1) + '.&nbsp;' + question.question + '</div>';
			output += '<div class="wsd-answer-container">';

			for ( let answerIndex = 0; answerIndex < question.options.length; answerIndex++ ) {
				var isCorrectAnswerClass = '';
				if ( _isReview ) {
					isCorrectAnswerClass = _isCorrectAnswer( sequence, answerIndex );
				}

				output += '<div class="wsd-answer-choice-container ' + isCorrectAnswerClass + '">'
					+ '<div><input class="wsd-answer-radio" id=id_"' + answerIndex + '" type="radio" name="' + _inputAnswerName + '" value="' + answerIndex + '" /></div>'
					+ '<div><label class="wsd-answer-choice" for=id_"' + answerIndex + '">' +  question.options[ answerIndex ] + '</label></div></div>';
				if ( _isReview ) {
					output += _showQuestionInfo( sequence, answerIndex );
				}
			}

			output += '</div>'; // end answer container

			// Buttons
			const prevDisabled = sequence === 0 ? 'disabled' : '';
			const nextText = (sequence + 1) === questionCount ? 'Finish' : 'Next';

			output += '<div class="wsd-question-button-container">';
			output += '<button type="button" class="btn wsd-btn-secondary wsd-question-prev-button" ' + prevDisabled + ' >Previous question</button>';
			output += '<button type="button" class="btn wsd-btn-primary wsd-question-next-button">' + nextText + '</button>';
			output += '</div>'; // end button container

			output += '</div>'; // end question container

			if ( _isReview ) {
				output += _showAnswerGrid();
				console.log(output );
			}

			// into DOM
			document.querySelector ( _options.renderInto ).innerHTML = output;

			// Apply hook if needed
			if ( _isReview ) {
				_showAnswerGridHook();
			}

			// If we have an answer in session storage, set it
			const allAnswers = _getAnswersFromSession ();
			if ( allAnswers[ sequence ] ) {
				// have an answer.. set value
				const allInput = document.getElementsByName ( _inputAnswerName );
				allInput[ allAnswers[ sequence ].answer ].setAttribute ( 'checked', true );
			}

			// now, hook into the prev, next buttons.
			document.querySelector ( '.wsd-question-next-button' ).addEventListener ( 'click', ( event ) => {
				event.preventDefault ();
				if ( document.querySelector ( 'input[name="wsd-answer"]:checked' ) ) {
					const answer = document.querySelector ( 'input[name="wsd-answer"]:checked' ).value;
					resolve ( { answer, direction: _directionNext } );
				}
			} );

			// Note: can resolve without an answer since we're going back
			document.querySelector ( '.wsd-question-prev-button' ).addEventListener ( 'click', ( event ) => {
				event.preventDefault ();
				if ( document.querySelector ( 'input[name="wsd-answer"]:checked' ) ) {
					const answer = document.querySelector ( 'input[name="wsd-answer"]:checked' ).value;
					return resolve ( { answer, direction: _directionPrev } );
				}
				resolve ( { answer: null, direction: _directionPrev } );
			} );

		} );
	};

	/**
	 * In review mode, we show the answer info under the correct answer
	 *
	 * @param sequence
	 * @param answerIndex
	 * @private
	 */
	const _showQuestionInfo = function( sequence, answerIndex ) {
		var question = _getQuestionsForExam( _thisLevel )[ sequence ];
		// get associated server answer.
		let serverAnswer = _serverAnswers[ sequence ];
		if ( serverAnswer.answer === answerIndex ) {
			// show info!!!
			return '<div class="wsd-answer-info">' + serverAnswer.answer_info + '</div>';
		}
		// check if this answer is the selected asnwer -- which is wrong!
		var allAnswers = _getAnswersFromSession ()[ sequence ];
		if ( allAnswers.answer === answerIndex ) {
			return '<div class="wsd-incorrect-answer"></div>';
		}
		debugger;
		return '';
	};

	/**
	 * iterate through our questions... take action on response.
	 *
	 * @param questions
	 * @param level
	 * @param startAt (optional) Start at sequence 'x'
	 * @returns {Promise<void>}
	 * @private
	 */
	const _showQuestions = async function ( questions, level, startAt  ) {
		questions.length = 3;
		let sequence = 0;
		if ( startAt ) {
			sequence = startAt;
		}
		while ( true ) { // use while since this can be infinite :-)
			const response = await _showQuestion ( questions[ sequence ], sequence, questions.length );

			if ( response.answer !== null ) {
				_saveAnswer ( parseInt ( response.answer ), sequence, questions[ sequence ].id );
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

		_processAnswers ( level );
	}

	/**
	 * SHow the result...
	 *
	 * @param results
	 * @param answeredCorrectly
	 * @private
	 */
	const _showResult = function ( results, answeredCorrectly ) {
		const percent = Math.round ( _examAnsweredCorrectly / _userAnswers.length * 100 );
		let output = '<div class="wsd-result-container">';
		output += '<div class="wsd-result-header">';
		output += '<div class="wsd-result-percentage">' + percent + '%' + '</div>';

		output += '<div class="wsd-result-review-questions">You can review your questions, or, retake the test</div>';

		output += '<div class="wsd-review-button-container">';
		output += '<button type="button" class="btn wsd-btn-primary ' + _reviewButton + '">Review</button>';
		output += '<button type="button" class="btn wsd-btn-primary ' + _retakeButton + '">Retake</button>';
		output += '</div>'; // end button container

		output += '</div>'; // end result-header
		output += '</div>'; // end result-container
		document.querySelector ( _options.renderInto ).innerHTML = output;

		// hook into buttons
		document.querySelector ( '.' + _retakeButton ).addEventListener ( 'click', ( event ) => {
			event.preventDefault ();
			// empty session storage for retakes!
			sessionStorage.removeItem ( _sessionStorageKey );
			_isReview = false;
			_showExam ( _thisExam );
		} );

		document.querySelector ( '.' + _reviewButton ).addEventListener ( 'click', ( event ) => {
			event.preventDefault ();
			_isReview = true;
			_showExam ( _thisExam );
		} );
	};

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
			_renderExamList ();
		},

		/**
		 * Initialise method.
		 *
		 * ===================================================================
		 * options contains:
		 *
		 * authToken - Mandatory - Token to be used
		 * endpoint - Mandatory - TPT APP Server endpoint (hostname only)
		 * renderInto - Options - Dom mode where exams will be shown.
		 *
		 *
		 * Callbacks - All optional
		 * ex: options.onAnswer=function
		 *
		 * Will pass in an event object to the callback.
		 * All callbacks have: --> event.name = Name of the event such as 'onAnswer'
		 *
		 * Callbacks:
		 * onAnswer - When a user answers a question.
		 * event.currentQuestion, event.nextQuestion
		 *
		 * onNext - User has clicked Next
		 * event.currentQuestion, event.nextQuestion
		 *
		 * onPrevious - User has clicked previous
		 * event.currentQuestion, event.nextQuestion
		 *
		 * onFinish - User has completed exam.
		 * event.results contains the results.  0=true, 1=false, 2=true...
		 *
		 * onReview - User wants to review the answers
		 * onRetake - User wants to retake the exam
		 * event.
		 *
		 * ===================================================================
		 *
		 * @param options
		 */
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
