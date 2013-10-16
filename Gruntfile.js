//Wrapper function with one parameter
module.exports = function(grunt) {

	grunt.initConfig({

		pkg: grunt.file.readJSON('package.json'),

		clean: {
			dist: {
				src: ["dist/"]
			}
		},

		ngmin: {
			controllers: {
				src: ['js/jhades-report.js'],
				dest: 'dist/temp/jhades-report-ngmin.js'
			},
			directives: {
				expand: true,
				src: ['js/jhades-all.js'],
				dest: 'dist/temp'
			}
		},

		concat: {
			js: {
				src: ['js/libs/jquery-1.9.1.js',
					'js/libs/jquery.dataTables.js',
					'js/libs/bootstrap.js',
					'js/libs/prettify.js',
					'js/libs/angular.js',
					'js/libs/spin.js',
					'js/libs/jquery.ui.widget.js',
					'js/libs/jquery.iframe-transport.js',
					'js/libs/jquery.fileupload.js',
					'js/libs/socket.io.js'],
				dest: 'dist/jhades-site-libs.js'
			},
			index: {
				src: ['dist/jhades-site-libs.js',
					'dist/temp/js/jhades-all.js','js/jhades-index.js'],
				dest: 'dist/jhades-site-index.js'
			},
			report: {
				src: ['dist/jhades-site-libs.js',
				'dist/temp/js/jhades-all.js','dist/temp/jhades-report-ngmin.js'],
				dest: 'dist/jhades-site-report.js'
			},
			documentation: {
				src: ['dist/jhades-site-libs.js',
				'dist/temp/js/jhades-all.js'],
				dest: 'dist/jhades-site-documentation.js'
			}
		},

		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
				mangle: false
			},
			index: {
				src: 'dist/jhades-site-index.js',
				dest: 'dist/jhades-site-index.min.js'
			},
			report: {
				src: 'dist/jhades-site-report.js',
				dest: 'dist/jhades-site-report.min.js'
			},
			documentation: {
				src: 'dist/jhades-site-documentation.js',
				dest: 'dist/jhades-site-documentation.min.js'
			}
		},

		cssmin: {
			combine: {
				files: {
					'dist/temp/jhades-site.css': ['css/*.css']
				}
			},
			minify: {
				expand: true,
				cwd: 'dist/temp',
				src: ['*.css', '!*.min.css'],
				dest: 'dist/',
				ext: '.min.css'
			}
		},

		copy: {
			main: {
				files: [
					{expand: true, src: ['./*.html'], dest: 'dist/', filter: 'isFile'},
					{expand: true, src: ['./server.js'], dest: 'dist/', filter: 'isFile'},
					{expand: true, src: ['./*.sh'], dest: 'dist/', filter: 'isFile'},
					{expand: true, src: ['img/*'], dest: 'dist/'},
					{expand: true, src: ['js/google_analytics.js'], dest: 'dist/'},
					{expand: true, src: ['sitemap.xml'], dest: 'dist/'}
				]
			}
		},

		useminPrepare: {
			html: 'dist/*.html',
			options: {
				dest: 'dist'
			}
		},

		usemin: {
			html: ['dist/*.html'],
			css: ['dist/*.min.css'],
			options: {
				dirs: ['dist']
			}
		},

		chmod: {
			options: {
				mode: '755'
			},
			yourTarget1: {
				src: ['dist/*.sh']
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-ngmin');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-usemin');
	grunt.loadNpmTasks('grunt-chmod');

	grunt.registerTask('build', [
		'clean:dist',
		'ngmin',
		'concat',
		'cssmin',
		'uglify',
		'copy',
		'useminPrepare',
		'usemin',
		'chmod'
	]);


	grunt.registerTask('default', ['build']);

};
