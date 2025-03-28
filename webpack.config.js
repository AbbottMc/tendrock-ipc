const path = require('path');
const TerserPlugin = require("terser-webpack-plugin");
const envHelpers = require('./environment-helpers');
const scriptOutputFolderName = envHelpers.getScriptOutputFolderName();
const scriptEntry = envHelpers.getScriptEntry();
const projectName = envHelpers.getProjectName();

module.exports = {
  mode: "none",
  entry: {
    Main: `./${scriptEntry}`,
    child: `./scripts/test/child/index.ts`,
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, scriptOutputFolderName)
  },
  experiments: {
    outputModule: true
  },
  externalsType: "module",
  externals: {
    "@minecraft/server": "@minecraft/server",
    "@minecraft/server-ui": "@minecraft/server-ui"
  },
  optimization: {
    minimize: false,
    minimizer: [
      new TerserPlugin({
        test: /\.js(\?.*)?$/i,
        terserOptions: {
          ecma: 6,
          parse: {},
          compress: {},
          mangle: true,
          module: true,
          toplevel: true,
          format: {
            comments: false
          }
        },
      }),
    ],
    usedExports: true, // 表示输出结果中只导出那些在外部使用了的成员
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', {modules: false}],
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
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
    // alias: {
    //   '@obsidian/server': 'yalc/@obsidian/server', // 根据你的yalc配置来设置
    // },
  }
};