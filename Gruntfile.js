module.exports = function(grunt) {
    var jsFiles = [
        "src/js/TinyPlayer.js",
    ];

    var lessFiles = [
        "src/less/**/*.less",
        "src/less/fontello.css"
    ];

    grunt.initConfig({
        jshint: {
            files: ['Gruntfile.js', "src/js/**/*.js"],
            options: {
                globals: {
                    TinyPlayer: true
                },
                evil: true
            }
        },

        concat: {
            dev: {
                files: {
                    "build/TinyPlayer.js": jsFiles,
                }
            }
        },

        uglify: {
            dist: {
                files: {
                    "build/TinyPlayer.min.js": jsFiles,
                }
            }
        },

        less: {
           dev: {
                options: {
                    sourceMap: true,
                    sourceMapName: "build/lessSourceMap.map"
                },
                files: {
                    "build/TinyPlayer.css": lessFiles
                }
            },
            dist: {
                files: {
                    "build/TinyPlayer.min.css": lessFiles
                }
            }
        },

        copy: {
            files: {expand: true, cwd: "src/less", src: ["font/*", "images/*"], dest: "build"}
        },

        clean: {
            build: ['build/*'],
        },

        connect: {
            server: {
                options: {
                    port: 8000,
                    base: ".",
                    directory: ".",
                    livereload: true
                }
            }
        },

        watch: {
            app: {
                files: ["src/**/*", "examples/**/*"],
                tasks: ["default"],
                options: {
                    livereload: true
                }
            }
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks("grunt-contrib-connect");
    grunt.loadNpmTasks("grunt-contrib-less");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-copy");

    // Default task.
    grunt.registerTask('default', ['jshint', 'clean', 'concat:dev', 'less:dev', "copy"]);
    grunt.registerTask('dist', ['jshint', 'clean', 'uglify:dist', 'less:dist', "copy"]);
    grunt.registerTask("serve", ["default", "connect", "watch"]);
};
