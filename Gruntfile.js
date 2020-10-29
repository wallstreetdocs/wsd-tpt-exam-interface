module.exports = grunt => {

	require ( 'matchdep' ).filter ( 'grunt-*' ).forEach ( grunt.loadNpmTasks );

	grunt.initConfig ( {
		eslint: {
			options: {
				configFile: 'eslint.json',		// custom config

			},
			target: ['build/**/wsd*.js']
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
}
