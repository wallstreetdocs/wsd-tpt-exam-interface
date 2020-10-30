module.exports = grunt => {

	require ( 'matchdep' ).filter ( 'grunt-*' ).forEach ( grunt.loadNpmTasks );

	grunt.initConfig ( {
		eslint: {
			options: {
				configFile: 'eslint.json',		// custom config

			},
			target: ['build/**/wsd*.js']
		},
		sass: {
			dist: {
				files: {
					'public/css/main.css': 'build/sass/main.scss',
					'public/css/plain.css': 'build/sass/plain.scss'
				}
			}
		},
		uglify: {
			options: {
				mangle: false,
				mangleProperties: false,
				sourceMap: true,
				compress: {
					drop_debugger: false
				},
			},

			my_target: {
				files: {
					'public/js/wsd-exam-if.min.js': ['build/js/wsdCertificationIF.js', 'build/js/utils.js', 'build/js/main.js']
				}
			}
		}
	} );
	//grunt.loadNpmTasks ( 'grunt-eslint' );
	grunt.registerTask ( 'eslint', ['eslint'] );
	grunt.registerTask ( 'minify', ['uglify'] );
	grunt.registerTask ( 'css_compile', ['sass'] );
}
