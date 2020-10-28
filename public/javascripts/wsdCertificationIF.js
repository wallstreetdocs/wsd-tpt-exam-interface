if ( !window.WSD ) {
	window.WSD = {
		debug: true,
	}
}

/**
 * WSD Global certification interface object
 *
 * @type {{init: init, viewAllExams: viewAllExams}}
 */
window.WSD.certificationsIF = (function () {
	var _allExams = null;
	var _options = {};
	var _answersEndpoint = 'external/exams/answers/';
	var _buttonCorrectClass = 'wsd-button-correct';
	var _buttonIncorrectClass = 'wsd-button-incorrect';
	var _examAnsweredCorrectly = 0;
	var _examTitle;
	var _examsEndpoint = 'external/exams';
	var _directionNext = 'next';
	var _directionPrev = 'prev';
	var _gridButtonContainer = 'wsd-grid-button-container';
	var _hasPassed = false;
	var _inputAnswerName = 'wsd-answer';
	var _isRetake = false; // flag to idicate retake
	var _isReview = false;  // flag to control review mode
	var _percent;
	var _resultsEndpoint = 'external/exams/results';
	var _retakeButton = 'wsd-retake-button';
	var _reviewButton = 'wsd-review-button';
	var _serverAnswers;
	var _sessionStorageKey = 'wsd-answers';
	var _thisExam = null;   // current exam being taken. (/level-1...)
	var _thisLevel;    // the level that is being taken
	var _userAnswers;

	var XHR_GET = 'GET';
	var XHR_POST = 'POST';

	/**
	 * Emit an event.
	 *
	 * Object has the structure of 'event name', 'attributes as applicable'
	 *
	 * @param name - name of event
	 * @param event
	 * @private
	 */
	var _emitEvent = function ( name, event ) {
		var x = _options[ name ];
		if ( !_options[ name ] ) {
			return;
		}
		_options[ name ] ( event );
	}

	/**
	 * Helper to return hostname
	 *
	 * @returns {string}
	 * @private
	 */
	var _getHostnameUrl = function () {
		var hostnameURL = new URL ( _options.endpoint );
		return hostnameURL.protocol + '//' + hostnameURL.hostname + ':' + hostnameURL.port + '/';
	}

	/**
	 * Get the answers from our server.  Called at the end of the exam
	 *
	 * @param level
	 * @returns {Promise<unknown>}
	 * @private
	 */
	var _getAnswersFromServer = function ( level ) {
		return _xhr ( XHR_GET, _getHostnameUrl () + _answersEndpoint + level );
	};

	/**
	 * All user answers are stored in sessionStorage.  Return them.
	 *
	 * @returns {*[]}
	 * @private
	 */
	var _getAnswersFromSession = function () {
		var storageObj = sessionStorage.getItem ( _sessionStorageKey );
		var allAnswers;
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
	var _getAnswerToQuestion = function ( answers, id ) {
		var rightAnswer = null;
		var answerInfo = null;
		for ( var answer of answers ) {
			if ( answer.id === id ) {
				rightAnswer = answer.answer;
				answerInfo = answer.answer_info;
				break;
			}
		}
		return [rightAnswer, answerInfo];
	};

	var _finish = function () {

	};

	/**
	 * Given a level, return all question associated with it.
	 *
	 * @param thisLevel
	 * @returns {*}
	 * @private
	 */
	var _getQuestionsForExam = function ( thisLevel ) {
		return _allExams.certificationQuestions.filter ( ( entry ) => {
			return entry.level === thisLevel;
		} );
	};

	/**
	 * Given a question sequence and an answer index.. is it correct?
	 *
	 * @param sequence
	 * @param answerIndex
	 * @returns {string}
	 * @private
	 */
	var _isCorrectAnswer = function ( sequence, answerIndex ) {
		var serverAnswer = _serverAnswers[ sequence ];
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

	var _playVideo = function ( url ) {
		var output = '<div class="wsd-video-container">';
		var container = document.querySelector ( _options.renderInto );
		output += '<iframe id="ytplayer" type="text/html" '
			+ 'width="' + (container.clientWidth * .8) + '" '
			+ 'height="' + (container.clientWidth * .8 / 1.77) + '" '   // keep 16:9 ratio
			+ 'src="' + url + '" '
			+ 'frameborder="0"></iframe>';
		output += '<button class="btn wsd-btn-primary" id="wsd-begin-test-button">Begin test</button>';
		output += '</div>';

		output = _renderHook ( 'showVideo', output );
		document.querySelector ( _options.renderInto ).innerHTML = output;

		// hook into begin button
		document.querySelector ( '#wsd-begin-test-button' ).addEventListener ( 'click', function ( event ) {
			_showExam ( _thisExam );
		} );
	}

	/**
	 * Called when finished...
	 *
	 * Augment original questions with the answer and the answer info. and call showResults
	 *
	 * @param level
	 * @returns {Promise<void>}
	 * @private
	 */
	var _processAnswers = function ( level ) {
		_getAnswersFromServer ( level )
			.then ( function ( response ) {
				_serverAnswers = response;
				// match questions to answer via their id.
				_userAnswers = _getAnswersFromSession ();

				_emitEvent ( 'onProcessAnswers',
					{
						servernswers: _serverAnswers,
						userAnswer  : _userAnswers
					} );

				_examAnsweredCorrectly = 0;

				for ( var i = 0; i < _userAnswers.length; i++ ) {
					var answer = _userAnswers[ i ];
					// find this id in server answers
					var [rightAnswer, answerInfo] = _getAnswerToQuestion ( _serverAnswers, answer.id );
					answer.answerInfo = answerInfo;
					answer.isCorrect = rightAnswer === answer.answer;
					if ( answer.isCorrect ) {
						_examAnsweredCorrectly++;
					}
				}

				_percent = Math.round ( _examAnsweredCorrectly / _userAnswers.length * 100 );
				_hasPassed = false;
				if ( _percent >= _options.passMark ) {
					_hasPassed = true;
				}
				_sendResult ();
				_showResult ();
			} ); // end then
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
	var _renderExamList = async function () {
		var output = '<div class="wsd-page">';
		var index = 0;
		_allExams.certificationLevels.forEach ( ( level ) => {
			// if no video, don't show!
			if ( !level.video ) {
				return;
			}

			var difficulty = 'Hard'; // default
			if ( level.name === 'Level 1' ) {
				difficulty = 'Easy'
			}
			if ( level.name === 'Level 2' ) {
				difficulty = 'Medium'
			}

			output += '<div class="wsd-exam-container" id="wec-' + index + '">';
			output += '<div class="wsd-exam-title">' + level.body.display_name + '</div>';
			output += '<div class="wsd-exam-image"><img src="' + level.image + '" /></div>';
			output += '<div class="wsd-exam-video-duration">Duration: ' + level.video_duration + ' (mins)</div>';
			output += '<div class="wsd-exam-description">' + level.description + '</div>';
			output += '<div classs="wsd-exam-difficulty">Difficulty: ' + difficulty + '</div>';
			output += '<div><a class="wsd-begin-test" href="' + level.body.url + '">Begin test &rarr;</a></div>';
			output += '<input type="hidden" value="' + level.video + '" />';
			output += '</div>';
			index++;
		} );

		output += '</div>';
		output = _renderHook ( 'showExamList', output );

		document.querySelector ( _options.renderInto ).innerHTML = output;

		var allTests = document.querySelectorAll ( '.wsd-begin-test' );
		allTests.forEach ( function ( test ) {
			test.addEventListener ( 'click', function ( event ) {
				event.preventDefault ();
			} );
		} )

		var allContainers = document.querySelectorAll ( '.wsd-exam-container' );
		allContainers.forEach ( function ( container ) {
			container.addEventListener ( 'click', function ( event ) {
				var href = document.querySelector ( '#' + this.id + ' .wsd-begin-test' );
				var exam = new URL ( href );
				_thisExam = exam.pathname;

				// now find video url.  100% to have one otherwise the exam
				// does not show
				var input = document.querySelector ( '#' + this.id + ' input' );

				if ( !input ) {
					throw new Error ( 'Cannot find video URL' );
				}

				_playVideo ( input.value );

			} );
		} );

	};

	/**
	 * Callback to renderHook -- provides opportunity for clients to influence
	 * generated HTML.
	 *
	 * @param html
	 * @returns {*}
	 */
	var _renderHook = function ( name, html ) {
		if ( _options.renderHook ) {
			return _options.renderHook ( {
				name,
				html
			} );
		}
		return html
	};

	/**
	 * Save the answer... Update session storage.
	 *
	 * @param answer
	 * @param sequence
	 * @private
	 */
	var _saveAnswer = function ( answer, sequence, id ) {
		var allAnswers = _getAnswersFromSession ();
		allAnswers[ sequence ] = { answer, id };
		sessionStorage.setItem ( _sessionStorageKey, JSON.stringify ( allAnswers ) );
	};

	_sendResult = function () {

		var results = {
			levelName     : 'Level ' + _thisLevel,
			hasPassed     : _hasPassed,
			totalScore    : _examAnsweredCorrectly,
			totalQuestions: _userAnswers.length,
			passingScore  : _options.passMark,
		}

		_xhr ( XHR_POST, _options.endpoint + _resultsEndpoint, results )
			.then ( (function ( response ) {
					debugger;
					console.log ( response );
				})
			);
	};

	/**
	 * When we are in review mode, show a grid of answers that are marked
	 * correct, or incorrect.
	 */
	var _showAnswerGrid = function () {
		var output = '<div class="' + _gridButtonContainer + '">';
		output += '<hr />';
		for ( var i = 0; i < _userAnswers.length; i++ ) {
			console.log ( i, _userAnswers[ i ].isCorrect );
			var buttonText = _userAnswers[ i ].isCorrect ? '&check;' : '&#x2A09;';
			var buttonClass = _userAnswers[ i ].isCorrect ? _buttonCorrectClass : '';
			output += '<button class="wsd-grid-button '
				+ buttonClass
				+ '">'
				+ (i + 1)
				+ '&nbsp'
				+ '</button>';
		}
		output += '</div>';
		return output;
	};

	/**
	 * Show the buttons that indicate right/wrong answers at the bottom
	 * of the screen...
	 *
	 * @private
	 */
	var _showAnswerGridHook = function () {
		// hook into button so we can go directly to that question.
		var gridButtons = document.querySelectorAll ( '.wsd-grid-button' );
		// Hook into click event on each button
		gridButtons.forEach ( link => {
			link.addEventListener ( 'click', ( event ) => {
				event.preventDefault ();
				var sequence = parseInt ( event.target.innerHTML ) - 1;
				var questions = _getQuestionsForExam ( _thisLevel );
				_showQuestions ( questions, _thisLevel, sequence );
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
	var _showExam = function ( exam ) {
		// find exam.
		var thisExam;
		exam = exam.replace ( '/', '' );

		for ( var item of _allExams.certificationLevels ) {
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

		_emitEvent (
			'onShowExam',
			{
				isReview : _isReview,
				isRetake : _isRetake,
				examTitle: _examTitle,
				level    : _thisLevel
			} );

		// now get questions from certification questions...
		var questions = _getQuestionsForExam ( _thisLevel );
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
	var _showQuestion = function ( question, sequence, questionCount ) {
		return new Promise ( ( resolve, reject ) => {

			_emitEvent ( 'onShowQuestion',
				{ sequence } );

			var disabled = _isReview ? 'disabled' : '';

			var output = '<div class="wsd-question-container">';

			output += '<div class="wsd-exam-title">' + _examTitle + '</div>';
			output += '<div class="wsd-question-header">Q' + (sequence + 1) + '.&nbsp;' + question.question + '</div>';
			output += '<div class="wsd-answer-container">';

			for ( var answerIndex = 0; answerIndex < question.options.length; answerIndex++ ) {
				var isCorrectAnswerClass = '';
				if ( _isReview ) {
					isCorrectAnswerClass = _isCorrectAnswer ( sequence, answerIndex );
				}

				output += '<div class="wsd-answer-choice-container ' + isCorrectAnswerClass + '">'
					+ '<div><input ' + disabled + ' class="wsd-answer-radio" id=id_"' + answerIndex + '" type="radio" name="' + _inputAnswerName + '" value="' + answerIndex + '" /></div>'
					+ '<div><label class="wsd-answer-choice" for=id_"' + answerIndex + '">' + question.options[ answerIndex ] + '</label></div></div>';
				if ( _isReview ) {
					output += _showQuestionInfo ( sequence, answerIndex );
				}
			}

			output += '</div>'; // end answer container

			// Buttons
			var prevDisabled = sequence === 0 ? 'disabled' : '';
			var nextText = (sequence + 1) === questionCount ? 'Finish' : 'Next';

			output += '<div class="wsd-question-button-container">';
			output += '<button type="button" class="btn wsd-btn-secondary wsd-question-prev-button" ' + prevDisabled + ' >Previous question</button>';
			output += '<button type="button" class="btn wsd-btn-primary wsd-question-next-button">' + nextText + '</button>';
			output += '</div>'; // end button container

			if ( _isReview ) {
				output += _showAnswerGrid ();
			}

			output += '</div>'; // end question container

			output = _renderHook ( 'showQuestion', output );
			// into DOM
			document.querySelector ( _options.renderInto ).innerHTML = output;

			// Apply hook if needed
			if ( _isReview ) {
				_showAnswerGridHook ();
			}

			// If we have an answer in session storage, set it
			var allAnswers = _getAnswersFromSession ();
			if ( allAnswers[ sequence ] ) {
				// have an answer.. set value
				var allInput = document.getElementsByName ( _inputAnswerName );
				allInput[ allAnswers[ sequence ].answer ].setAttribute ( 'checked', true );
			}

			// now, hook into the prev, next buttons.
			document.querySelector ( '.wsd-question-next-button' ).addEventListener ( 'click', ( event ) => {
				event.preventDefault ();
				if ( document.querySelector ( 'input[name="wsd-answer"]:checked' ) ) {
					var answer = document.querySelector ( 'input[name="wsd-answer"]:checked' ).value;
					resolve ( { answer, direction: _directionNext } );
				}
			} );

			// Note: can resolve without an answer since we're going back
			document.querySelector ( '.wsd-question-prev-button' ).addEventListener ( 'click', ( event ) => {
				event.preventDefault ();
				if ( document.querySelector ( 'input[name="wsd-answer"]:checked' ) ) {
					var answer = document.querySelector ( 'input[name="wsd-answer"]:checked' ).value;
					return resolve ( { answer, direction: _directionPrev } );
				}
				resolve ( { answer: null, direction: _directionPrev } );
			} );

			if ( _options.animateQuestions ) {
				document.querySelector ( '.wsd-question-container' ).style.left = '-2000px';
				setTimeout ( function () {
					document.querySelector ( '.wsd-question-container' ).style.left = '0px';

				}, 50 );
			}

		} );
	};

	/**
	 * In review mode, we show the answer info under the correct answer
	 *
	 * @param sequence
	 * @param answerIndex
	 * @private
	 */
	var _showQuestionInfo = function ( sequence, answerIndex ) {
		var question = _getQuestionsForExam ( _thisLevel )[ sequence ];
		// get associated server answer.
		var serverAnswer = _serverAnswers[ sequence ];
		if ( serverAnswer.answer === answerIndex ) {
			// show info!!!
			return '<div class="wsd-answer-info">' + serverAnswer.answer_info + '</div>';
		}
		// check if this answer is the selected asnwer -- which is wrong!
		var allAnswers = _getAnswersFromSession ()[ sequence ];
		if ( allAnswers.answer === answerIndex ) {
			return '<div class="wsd-incorrect-answer"></div>';
		}

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
	var _showQuestions = function ( questions, level, startAt ) {
		questions.length = 3;
		var sequence = 0;
		if ( startAt ) {
			sequence = startAt;
		}

		/**
		 * Recursive function to deal with iterating though the questions
		 * and waiting for each one to complete.
		 *
		 * renderQuestion is called below to sytart -- and also called within itself.
		 *
		 * Since renderQuestions returns a promise, the internal promise will
		 * @returns {Promise<unknown>}
		 */
		var renderQuestion = function() {
			return new Promise(function( resolve, reject) {
				_showQuestion ( questions[ sequence ], sequence, questions.length ).then ( function ( response ) {
					_emitEvent ( 'onAnswer',
						{
							response,
							sequence,
						} );
					if ( response.answer !== null ) {
						_saveAnswer ( parseInt ( response.answer ), sequence, questions[ sequence ].id );
					}
					if ( response.direction === _directionNext ) {
						sequence++;
						if ( sequence === questions.length ) {
							return resolve(); // resolve this promise
						}
					} else {
						sequence--;
					}
					renderQuestion().then(function() {
						console.log( '9');
						resolve(); // resolve promise
					})

				} );
			});
		}

		// Start question loop
		renderQuestion()
			.then(function() {
			// we're done..
			_emitEvent ( 'onFinish', {} );
			_processAnswers ( level );
		})

	}

	/**
	 * Show the result...
	 *
	 * @param results
	 * @param answeredCorrectly
	 * @private
	 */
	var _showResult = function ( results, answeredCorrectly ) {
		var output = '<div class="wsd-result-container">';
		output += '<div class="wsd-result-header">Results</div>';
		output += '<div class="wsd-result-header-2">';

		if ( _hasPassed ) {
			output += '<div class="wsd-result-text">' + _options.successText + '</div>';
		} else {
			output += '<div class="wsd-result-text">' + _options.failureText + '</div>';
		}

		output += '</div>';

		output += '<hr />';

		output += '<div class="wsd-score-text">Your score was: '
			+ '<span class="wsd-answered-correctly">' + _examAnsweredCorrectly + '</span>'
			+ ' / '
			+ '<span class="wsd-total-answers">' + _userAnswers.length + '</span>'
			+ ' or '
			+ '<span class="wsd-percent">' + _percent + '%' + '</span>'
			+ '</div>';

		output += '<div class="wsd-result-review-questions">You can review your questions, or, retake the test.</div>';

		output += '<div class="wsd-review-button-container">';
		output += '<button type="button" class="btn wsd-btn-primary ' + _reviewButton + '">Review</button>';
		output += '<button type="button" class="btn wsd-btn-primary ' + _retakeButton + '">Retake</button>';
		output += '</div>'; // end button container

		output += '</div>'; // end result-header
		output += '</div>'; // end result-container

		output = _renderHook ( 'showResult', output );
		document.querySelector ( _options.renderInto ).innerHTML = output;

		_isReview = false;
		_isRetake = false;

		// hook into buttons
		document.querySelector ( '.' + _retakeButton ).addEventListener ( 'click', ( event ) => {
			event.preventDefault ();
			// empty session storage for retakes!
			sessionStorage.removeItem ( _sessionStorageKey );
			_isReview = false;
			_isRetake = true;
			_showExam ( _thisExam );
		} );

		document.querySelector ( '.' + _reviewButton ).addEventListener ( 'click', ( event ) => {
			event.preventDefault ();
			_isReview = true;
			_showExam ( _thisExam );
		} );
	};

	var _xhr = function ( op, url, body ) {
		return new Promise ( ( resolve, reject ) => {
			var xhttp = new XMLHttpRequest ();

			xhttp.onreadystatechange = function () {
				if ( this.readyState == 4 && this.status == 200 ) {
					resolve ( JSON.parse ( xhttp.responseText ) );
				}
			};

			xhttp.open ( op, url );
			xhttp.setRequestHeader ( 'Authorization', 'Bearer ' + _options.authToken );

			if ( op === XHR_POST ) {
				xhttp.setRequestHeader ( 'Content-Type', 'application/json' );
				xhttp.send ( JSON.stringify ( body ) );
			} else {
				xhttp.send ();
			}
		} );
	};

	// Public methods
	var certifications = {

		viewAllExams: function () {
			// get all exams
			_xhr ( XHR_GET, _options.endpoint + _examsEndpoint )
				.then ( function ( exams ) {
					console.log ( exams );
					// render into a dom node
					_allExams = exams;
					_renderExamList ();
				} );
		},

		/**
		 * Initialise method.
		 *
		 * ===================================================================
		 *
		 * Options:
		 *
		 * ==== Mandatory ===
		 * authToken - Mandatory - Token to be used
		 * endpoint - Mandatory - TPT APP Server endpoint (hostname only)
		 *
		 * === Optional ===
		 * animateQuestions - Optional -- Do questions animate? (true | false
		 * iconSuccess - Optional - Icon for exam success
		 * iconFailure - Optional - Icon for exam failure
		 * iconSuccessText - Optional - Text when exam is passed
		 * iconSuccessFail - optional - Text when exam has failed
		 * renderInto - Optionals - Dom mode where exams will be shown.
		 *
		 * ===================================================================
		 *
		 * Callbacks - All optional
		 *
		 * A single eventCallback is called -- params include the name of the event and
		 * appopriate attributes
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
		 *
		 * preRender - passes generated HTML to callback.  Return modified HTML
		 *
		 * ===================================================================
		 *
		 * @param options
		 */
		init: function ( options ) {
			_options = options;
			_options.passMark = options.passMark
			                    ? options.passMark
			                    : 85;   // default to 85%
			_options.successText = options.successText
			                       ? options.successText
			                       : 'Congratulations!  You have passed.';
			_options.failureText = options.failureText
			                       ? options.failureText
			                       : 'You have not passed this time.';

			// ensure endpoint endswith '/'
			_options.endpoint = options.endpoint.endsWith ( '/' ) ? options.endpoint : options.endpoint + '/';

		}
	}

	return certifications;
}) ();
