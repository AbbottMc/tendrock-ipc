const path = require('path');
const BundleDeclarationsWebpackPlugin = require('bundle-declarations-webpack-plugin').default;

module.exports = {
  mode: "none",
  entry: './Main.ts',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'build')
  },
  experiments: {
    outputModule: true
  },
  externalsType: "module",
  externals: {
    "@minecraft/server": "@minecraft/server",
    "@minecraft/server-ui": "@minecraft/server-ui"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ["@babel/plugin-transform-runtime"],
            cacheDirectory: true
          }
        }
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    //event010 declarationBundlerWebpackPlugin({removeComments: false, removeMergedDeclarations: true})
    //event010 declarationBundlerWebpackPlugin({name:'@tenon-minecraft/server', removeSource: false})
    new BundleDeclarationsWebpackPlugin({
      entry: [
        {
          filePath: "./Main.ts",
          output: {
            sortNodes: false,
            noBanner: true,
            exportReferencedTypes: true
          }
        }],
      outFile: "../index.d.ts",
      // setting these will mean no post-processing
      removeEmptyLines: false,
      removeEmptyExports: false,
      removeRelativeReExport: true,
    }),
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  }
};