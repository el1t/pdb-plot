/**
 * @author: @AngularClass
 */

const webpack = require('webpack');
const helpers = require('./helpers');
const autoprefixer = require('autoprefixer');

/*
 * Webpack Plugins
 */
// problem with copy-webpack-plugin
const CopyWebpackPlugin = require('copy-webpack-plugin');
const DefinePlugin = require('webpack/lib/DefinePlugin');
const LoaderOptionsPlugin = require('webpack/lib/LoaderOptionsPlugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ForkCheckerPlugin = require('awesome-typescript-loader').ForkCheckerPlugin;
const HtmlElementsPlugin = require('./html-elements-plugin');
const AssetsPlugin = require('assets-webpack-plugin');
const ContextReplacementPlugin = require('webpack/lib/ContextReplacementPlugin');

/*
 * Webpack Constants
 */
const HMR = helpers.hasProcessFlag('hot');
const METADATA = {
	title: 'Period Doubling Bifurcation',
	baseUrl: '/',
	isDevServer: helpers.isWebpackDevServer(),
	HMR: HMR
};

/*
 * Webpack configuration
 *
 * See: http://webpack.github.io/docs/configuration.html#cli
 */
module.exports = function(options) {
	isProd = options.env === 'production';
	return {
		/*
		 * Cache generated modules and chunks to improve performance for multiple incremental builds.
		 * This is enabled by default in watch mode.
		 * You can pass false to disable it.
		 *
		 * See: http://webpack.github.io/docs/configuration.html#cache
		 */
		//cache: false,

		/*
		 * The entry point for the bundle
		 *
		 * See: http://webpack.github.io/docs/configuration.html#entry
		 */
		entry: {

			'polyfills': './src/polyfills.ts',
			'vendor': './src/vendor.ts',
			'app': './src/app.ts'

		},

		/*
		 * Options affecting the resolving of modules.
		 *
		 * See: http://webpack.github.io/docs/configuration.html#resolve
		 */
		resolve: {

			/*
			 * An array of extensions that should be used to resolve modules.
			 *
			 * See: http://webpack.github.io/docs/configuration.html#resolve-extensions
			 */
			extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],

			// An array of directory names to be resolved to the current directory
			modules: [helpers.root('src'), 'node_modules'],

		},

		/*
		 * Options affecting the normal modules.
		 *
		 * See: http://webpack.github.io/docs/configuration.html#module
		 */
		module: {

			rules: [
				{
					enforce: 'pre',
					test: /\.ts$/,
					loader: 'string-replace-loader',
					query: {
						search: '(System|SystemJS)(.*[\\n\\r]\\s*\\.|\\.)import\\((.+)\\)',
						replace: '$1.import($3).then(mod => (mod.__esModule && mod.default) ? mod.default : mod)',
						flags: 'g'
					},
					include: [helpers.root('src')]
				},

				/*
				 * Typescript loader support for .ts and Angular 2 async routes via .async.ts
				 * Replace templateUrl and stylesUrl with require()
				 *
				 * See: https://github.com/s-panferov/awesome-typescript-loader
				 * See: https://github.com/TheLarkInn/angular2-template-loader
				 */
				{
					test: /\.ts$/,
					loaders: [
						'@angularclass/hmr-loader?pretty=' + !isProd + '&prod=' + isProd,
						'awesome-typescript-loader'
					],
					exclude: [/\.(spec|e2e)\.ts$/]
				},

				{
					test: /.tsx$/,
					loader: 'babel-loader!awesome-typescript-loader',
						// 'babel-loader'
					// ],
					// query: {
					// 	useBabel: true,
					// 	useCache: true,
					// 	useTranspileModule: true,
					// 	babelOptions: {
					// 		presets: ['es2015'],
					// 		plugins: ['transform-vue-jsx']
					// 	}
					// }
				},

				/*
				 * Json loader support for *.json files.
				 *
				 * See: https://github.com/webpack/json-loader
				 */
				{
					test: /\.json$/,
					loader: 'json-loader'
				},

				/*
				 * Support sass files
				 */
				{
					test: /\.scss$/,
					exclude: /node_modules/,
					loaders: ['raw-loader', 'sass-loader', 'postcss-loader']
				},

				/* Raw loader support for *.html
				 * Returns file content as string
				 *
				 * See: https://github.com/webpack/raw-loader
				 */
				{
					test: /\.html$/,
					loader: 'raw-loader',
					exclude: [helpers.root('src/index.html')]
				},

				/* File loader for supporting images, for example, in CSS files.
				 */
				{
					test: /\.(jpg|png|gif)$/,
					loader: 'file'
				},

				{
					enforce: 'post',
					test: /\.js$/,
					loader: 'string-replace-loader',
					query: {
						search: 'var sourceMappingUrl = extractSourceMappingUrl\\(cssText\\);',
						replace: 'var sourceMappingUrl = "";',
						flags: 'g'
					}
				}
			]
		},

		/*
		 * Add additional plugins to the compiler.
		 *
		 * See: http://webpack.github.io/docs/configuration.html#plugins
		 */
		plugins: [
			new AssetsPlugin({
				path: helpers.root('dist'),
				filename: 'webpack-assets.json',
				prettyPrint: true
			}),

			/*
			 * Plugin: ForkCheckerPlugin
			 * Description: Do type checking in a separate process, so webpack don't need to wait.
			 *
			 * See: https://github.com/s-panferov/awesome-typescript-loader#forkchecker-boolean-defaultfalse
			 */
			new ForkCheckerPlugin(),
			/*
			 * Plugin: CommonsChunkPlugin
			 * Description: Shares common code between the pages.
			 * It identifies common modules and put them into a commons chunk.
			 *
			 * See: https://webpack.github.io/docs/list-of-plugins.html#commonschunkplugin
			 * See: https://github.com/webpack/docs/wiki/optimization#multi-page-app
			 */
			new webpack.optimize.CommonsChunkPlugin({
				name: ['polyfills', 'vendor'].reverse()
			}),

			/**
			 * Plugin: ContextReplacementPlugin
			 * Description: Provides context to Angular's use of System.import
			 *
			 * See: https://webpack.github.io/docs/list-of-plugins.html#contextreplacementplugin
			 * See: https://github.com/angular/angular/issues/11580
			 */
			new ContextReplacementPlugin(
				// The (\\|\/) piece accounts for path separators in *nix and Windows
				/angular(\\|\/)core(\\|\/)(esm(\\|\/)src|src)(\\|\/)linker/,
				helpers.root('src') // location of your src
			),

			/*
			 * Plugin: CopyWebpackPlugin
			 * Description: Copy files and directories in webpack.
			 *
			 * Copies project static assets.
			 *
			 * See: https://www.npmjs.com/package/copy-webpack-plugin
			 */
			new CopyWebpackPlugin([{
				from: 'src/assets',
				to: 'assets'
			}]),

			/*
			 * Plugin: HtmlWebpackPlugin
			 * Description: Simplifies creation of HTML files to serve your webpack bundles.
			 * This is especially useful for webpack bundles that include a hash in the filename
			 * which changes every compilation.
			 *
			 * See: https://github.com/ampedandwired/html-webpack-plugin
			 */
			new HtmlWebpackPlugin({
				template: 'src/index.html',
				chunksSortMode: 'dependency'
			}),

			/*
			 * Plugin: HtmlHeadConfigPlugin
			 * Description: Generate html tags based on javascript maps.
			 *
			 * If a publicPath is set in the webpack output configuration, it will be automatically added to
			 * href attributes, you can disable that by adding a "=href": false property.
			 * You can also enable it to other attribute by settings "=attName": true.
			 *
			 * The configuration supplied is map between a location (key) and an element definition object (value)
			 * The location (key) is then exported to the template under then htmlElements property in webpack configuration.
			 *
			 * Example:
			 *  Adding this plugin configuration
			 *  new HtmlElementsPlugin({
			 *    headTags: { ... }
			 *  })
			 *
			 *  Means we can use it in the template like this:
			 *  <%= webpackConfig.htmlElements.headTags %>
			 *
			 * Dependencies: HtmlWebpackPlugin
			 */
			new HtmlElementsPlugin({
				headTags: require('./head-config.common')
			}),

			new LoaderOptionsPlugin({
				options: {
					postcss: function() {
						return {
							defaults: [autoprefixer]
						};
					},
				}
			}),

			new DefinePlugin({
				'METADATA': JSON.stringify(METADATA)
			})
		],

		/*
		 * Include polyfills or mocks for various node stuff
		 * Description: Node configuration
		 *
		 * See: https://webpack.github.io/docs/configuration.html#node
		 */
		node: {
			global: true,
			crypto: 'empty',
			process: true,
			module: false,
			clearImmediate: false,
			setImmediate: false,
		}

	};
}
