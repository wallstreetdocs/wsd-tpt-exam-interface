/**
 * Grunt build file for the priip-hub App
 *
 */
module.exports = grunt => {

	// Load Grunt tasks declared in the package.json file
	require ( 'matchdep' ).filterDev ( 'grunt-*' ).forEach ( grunt.loadNpmTasks );

	let pkg = grunt.file.readJSON ( 'package.json' );

	// Project configuration.
	grunt.initConfig ( {

		pkg: pkg,

		// CSS auto-prefix
		autoprefixer: {
			all: {
				options: {
					browsers: [ 'last 2 versions', 'ie 9' ]
				},
				expand : true,
				src    : 'public/css/*.css',
				dest   : ''
			}
		},

		// SASS to CSS
		sass: {
			dev : {
				options: {
					style      : 'expanded',
					sourcemap  : 'none',
					lineNumbers: true
				},
				files  : [
					{
						expand : true,
						flatten: true,
						cwd    : 'build/sass/',
						src    : [ '*/*.scss' ],
						dest   : 'public/css/',
						ext    : '.min.css'
					}
				]
			},
			dist: {
				options: {
					style    : 'compressed',
				},
				files  : [
					{
						expand : true,
						flatten: true,
						cwd    : 'build/sass/',
						src    : [ '*/*.scss' ],
						dest   : 'public/css/',
						ext    : '.min.css'
					}
				]
			}
		},

		// Minify JS
		uglify: {
			dev       : {
				options: {
					beautify        : true,
					sourceMap       : false,
					mangle          : false,
					mangleProperties: false
				},
				files  : {
					'public/js/common/wsd.min.js'           : [
						'build/js/common/wsd/**/*.js'
					],
					'public/js/common/jquery.plugins.min.js': [
						'build/js/common/plugins/**/*.js'
					],
					'public/js/template/main.min.js'        : [
						'build/js/apps/template/**/*.js',
						'!build/js/apps/template/views/*.js'
					],
					'public/js/main/main.min.js'            : [
						'build/js/apps/main/**/*.js',
						'!build/js/apps/main/views/*.js',
						'!build/js/apps/main/views/**/*.js'
					],
					'public/js/admin/main.min.js'           : [
						'build/js/apps/admin/**/*.js',
						'!build/js/apps/admin/views/*.js'
					]
				}
			},
			dev_views : {
				options: {
					beautify        : true,
					sourceMap       : false,
					mangle          : false,
					mangleProperties: false,
					preserveComments: /[#|@]/
				},
				files  : [
					{
						expand: true,
						cwd   : 'build/js/apps/',
						src   : [
							'*/views/**/*.js'
						],
						dest  : 'public/js',
						ext   : '.min.js'
					}
				]
			},
			dist      : {
				files: {
					'public/js/common/wsd.min.js'           : [
						'build/js/common/wsd/**/*.js'
					],
					'public/js/common/jquery.plugins.min.js': [
						'build/js/common/plugins/**/*.js'
					],
					'public/js/template/main.min.js'        : [
						'build/js/apps/template/**/*.js',
						'!build/js/apps/template/views/*.js'
					],
					'public/js/main/main.min.js'            : [
						'build/js/apps/main/**/*.js',
						'!build/js/apps/main/views/*.js',
						'!build/js/apps/main/views/**/*.js'
					],
					'public/js/admin/main.min.js'           : [
						'build/js/apps/admin/**/*.js',
						'!build/js/apps/admin/views/*.js'
					]
				}
			},
			dist_views: {
				files: [
					{
						expand: true,
						cwd   : 'build/js/apps/',
						src   : [
							'*/views/**/*.js'
						],
						dest  : 'public/js',
						ext   : '.min.js'
					}
				]
			}
		},

		// Lint JS
		eslint: {
			server: {
				options: {
					configFile: 'eslint-server.json'
				},
				src    : [
					'controllers/**/*.js',
					'controllers/*.js',
					'helpers/**/*.js',
					'helpers/*.js',
					'middleware/**/*.js',
					'middleware/*.js',
					'models/**/*.js',
					'models/*.js',
					'routes/**/*.js',
					'routes/*.js',
					'services/**/*.js',
					'services/*.js',
					'application*.js'
				]
			},
			client: {
				options: {
					configFile: 'eslint-client.json'
				},
				src    : [
					'build/js/**/*.js'
				]
			}
		},

		// Watch for changes to sass
		watch: {
			css: {
				files  : [ 'build/sass/**/*.scss' ],
				tasks  : [ 'sass:dev', 'autoprefixer' ],
				options: {
					livereload: true
				}
			},
			js : {
				files  : [ 'build/js/**/*.js' ],
				tasks  : [ 'eslint:client', 'uglify:dev', 'uglify:dev_views' ],
				options: {
					livereload: true
				}
			}
		},

		// Mocha test runner
		mochaTest: {
			unit: {
				options: {
					reporter         : 'spec',
					quiet            : false,
					clearRequireCache: false,
					timeout          : 20000
				},
				src    : [
					'./test/unit/**/*.spec.js'
				]
			}
		},

		// Nightwatch e2e test runner - uses nightwatch.conf.js
		nightwatchjs: {
			main : {},
			admin: {}
		}

	} );

	/*
	 Custom Tasks
	 */

	// Production build task
	grunt.registerTask (
		'production', [
			'sass:dist', 'autoprefixer',
			'eslint', 'uglify:dist', 'uglify:dist_views'
		]
	);

	// Runs an application server
	grunt.registerTask ( 'start-server', 'Starts an instance of an application for testing', function ( app ) {

		// Set environment
		process.env.NODE_ENV = 'test';
		// Start the server
		require ( './application-' + app + '.js' );
		// Feedback
		grunt.log.writeln ( 'Starting ' + app + ' server on ' + process.env.WEB_DOMAIN + ' ... please wait' );
		// Mark grunt task as completed
		setTimeout ( this.async (), 5000 );

	} );

	// Test main app
	grunt.registerTask ( 'test-main', [
		'start-server:main',
		'mochaTest:unit',
		'nightwatchjs:main'
	] );

	// Test admin app
	grunt.registerTask ( 'test-admin', [
		'start-server:admin',
		'mochaTest:unit',
		'nightwatchjs:admin'
	] );

	// Test all app
	grunt.registerTask ( 'test', [
		'start-server:main',
		'mochaTest:unit',
		'nightwatchjs:main',
		//'start-server:admin',
		//'nightwatchjs:admin'
	] );

	// Unit tests
	grunt.registerTask ( 'unit', [
		'start-server:main',
		'mochaTest:unit'
	] );

	// E2E Test main app
	grunt.registerTask ( 'e2e-main', [
		'start-server:main',
		'nightwatchjs:main'
	] );

	// E2E Test admin app
	grunt.registerTask ( 'e2e-admin', [
		'start-server:admin',
		'nightwatchjs:admin'
	] );

}
