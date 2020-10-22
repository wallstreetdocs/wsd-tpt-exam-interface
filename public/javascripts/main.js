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
			Endpoint : $ ( '#endpoint'),
			SetOptions : $ ( '#setOptions'),
			BeginTest : $ ( '.beginTest'),
			GetAllExams : $ ( '.getAllExams' ),
		},

		_beginTest : function () {
			//WSD.Main._getAllExams()

		},

		_getAllExams : async function () {
			const results = await WSD.certificationsIF.viewAllExams();
			// populate list of exams
		},

		_sendExamList : function () {
			var token = WSD.Main.Dom.AuthToken.val().trim();
			if( token.length === 0 ) {
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

			// send request.
			var xhr = $.ajax ( endpoint, {
				headers: {
					"Authorization": "Bearer " + token
				},
				method  : 'GET',
				dataType: 'json'
			} );

			// When done..
			xhr.done ( function ( response ) {
				debugger;
				console.log( response );

			});
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
			WSD.certificationsIF.init( {
				endpoint,
				authToken,
				renderInto : '#examContainer'
			})
		},

		// Init routine
		init: function () {

			var self = this;
			self.Dom.GetAllExams.on( 'click', self._getAllExams );
			self.Dom.SetOptions.on( 'click', self._setOptions );

			WSD.logger('info', 'Main initialised...');

		}

	};

	// Init the module
	WSD.Main.init ();

}) ( jQuery );
