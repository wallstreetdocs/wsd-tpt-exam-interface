/*
	Data view controller
 */
(function ( $ ) {

	// Check namespace has been created
	if ( typeof window[ 'WSD' ] === 'undefined' ) {
		throw new Error ( 'WSD namespace not defined' );
	}
	WSD.Main = {

		// DOM Nodes
		Dom: {
			AuthToken : $ ( '#authToken'),
			Console: $ ( '#console' ),
			Endpoint : $ ( '#endpoint'),
			SetOptions : $ ( '#setOptions'),
			BeginTest : $ ( '.beginTest'),
			GetAllExams : $ ( '.getAllExams' ),
			ShowConsole: $ ( '#showConsole' ),
		},

		_getAllExams : function ( event ) {

			if ( WSD.Main.Dom.AuthToken.val().trim() === '' ) {
				alert( 'Please supply an authentication token.');
				return
			}
			event.stopPropagation();
			WSD.Main._setOptions();
			WSD.certificationsIF.viewAllExams();

		},


		_eventCallback : function ( name, event ) {
			var content = name + ' ' +  JSON.stringify( event ) + '\n';
			document.getElementById( 'examConsoleContent').value += content;
			var console = $('#examConsoleContent');
			console.scrollTop(console[0].scrollHeight);
		},

		_onAnswer : function ( event ) {
			WSD.Main._eventCallback ( 'onAnswer', event );
		},

		_onFinish : function ( event ) {
			WSD.Main._eventCallback ( 'onFinish', event );
		},

		_onProcessAnswers : function ( event ) {
			WSD.Main._eventCallback ( 'onProcessAnswers', event );

		},

		_onShowExam : function ( event ) {
			WSD.Main._eventCallback ( 'onShowExam', event );
		},

		_onShowQuestion : function ( event ) {
			WSD.Main._eventCallback ( 'onShowQuestion', event );
		},

		_toggleConsole : function () {
			WSD.Main.Dom.Console.toggle( 250);
		},

		/**
		 *
		 * @param event  (Object properties = {name, html})
		 * @returns {html}
		 * @private
		 */
		_renderHook : function ( event ) {
			return event.html;
		},

		_setOptions : function () {
			var authToken = WSD.Main.Dom.AuthToken.val().trim();
			if( authToken.length === 0 ) {
				$('.noauthtoken').show();
				return;
			}

			$('.noauthtoken').hide(); // remove in case it was shown

			var endpoint = WSD.Main.Dom.Endpoint.val().trim();
			if( endpoint.length === 0 ) {
				$('.noendpoint').show();
				return;
			}

			$('.noendpoint').hide();
			sessionStorage.setItem( 'wsd-endpoint', endpoint );
			sessionStorage.setItem( 'wsd-authToken', authToken );

			WSD.certificationsIF.init( {
				endpoint: endpoint,
				authToken: authToken,
				animateQuestions: false,
				eventCallback: WSD.Main._eventCallback,
				onAnswer: WSD.Main._onAnswer,
				onFinish: WSD.Main._onFinish,
				onProcessAnswers: WSD.Main._onProcessAnswers,
				onShowExam: WSD.Main._onShowExam,
				onShowQuestion: WSD.Main._onShowQuestion,
				renderHook: WSD.Main._renderHook,
				renderInto : '#examContainer'
			})
		},

		// Init routine
		init: function () {
			var self = this;
			self.Dom.GetAllExams.on( 'click', self._getAllExams );
			self.Dom.SetOptions.on( 'click', self._setOptions );
			self.Dom.ShowConsole.on( 'change', self._toggleConsole )
			self.Dom.Endpoint.val( sessionStorage.getItem( 'wsd-endpoint'));
			self.Dom.AuthToken.val( sessionStorage.getItem( 'wsd-authToken'));
alert( 'a');
			WSD.logger('info', 'Main initialised...');

		}

	};

	// Init the module
	WSD.Main.init ();

}) ( jQuery );
