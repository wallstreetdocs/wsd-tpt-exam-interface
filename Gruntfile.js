module.exports = grunt => {
	grunt.initConfig ( {
		eslint: {
			options: {
				configFile: 'eslint.json',		// custom config

			},
			target: ['build/**/wsd*.js']
		}
	} );
	grunt.loadNpmTasks ( 'grunt-eslint' );
	grunt.registerTask ( 'default', ['eslint'] );
}
