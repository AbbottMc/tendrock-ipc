import {argv, logger, option, series, task, webpackTask} from "just-scripts";
import path from "path";
import * as envHelpers from './environment-helpers';
import * as fs from "node:fs";
import {exec} from 'child_process';
import * as fileUtils from "./file-utils";
import {copyFolder} from "./file-utils";

require('dotenv').config();

// Win32 or UWP
option('exetype');

task("pack-addon", async () => {
  const exeType: string = (argv().exetype as string).toUpperCase();
  if (!exeType) {
    throw 'No exetype option specified - unknown target platform';
  }

  const extensionName = envHelpers.getProjectName() + '.mcaddon';
  const extensionArchivePath = path.resolve(__dirname, 'dist', extensionName);

  // await _createAddon(extensionArchivePath, bpFolder, bpName, bevTargetFolder, rpFolder, rpName, resTargetFolder);

  console.log(`.mcaddon has been created at "${extensionArchivePath}"`);
});

// async function _createAddon(
//   extensionArchivePath: string, bpPath: string, bpName: string, bevTargetFolder: string, rpPath: string, rpName: string, resTargetFolder: string
// ) {
//   const stream = fs.createWriteStream(extensionArchivePath);
//   const archive = archiver.create('zip', {zlib: {level: 9}});
//
//   archive.on('error', function (err) {
//     throw err;
//   });
//
//   await new Promise((resolve, reject) => {
//     archive.pipe(stream);
//     archive.directory(bpPath, bpName);
//
//     // Resource packs are optional
//     if (fs.existsSync(rpPath)) {
//       archive.directory(rpPath, rpName);
//     }
//     archive.on('error', err => {
//       throw err;
//     });
//     archive.finalize();
//
//     stream.on('close', function () {
//       console.log(`zipped ${archive.pointer()} total bytes.`);
//       resolve(undefined);
//     });
//   });
// }

task("test", () => {
  logger.info("test")
  return webpackTask({
    config: './webpack.config.js',
    onCompile(err, stats) {
      if (!err && !stats.hasErrors()) {
        logger.info('\nBuild completed, deploying to output...');
      } else {
        logger.error(err);
      }
      logger.info("webpack completed")
    }
  })
});


function getEnvVars() {
  // const exeType: string = (argv().$0 as string)?.toUpperCase();
  // if (!exeType) {
  //   throw 'No exetype option specified - unknown target platform';
  // }
  const bevFolderNameList = envHelpers.getBevFolderNameList();
  const resFolderNameList = envHelpers.getResFolderNameList();
  const bevTargetFolderList = envHelpers.getDevBevFolderList("UWP");
  const resTargetFolderList = envHelpers.getDevResFolderList("UWP");
  const bevTargetFolder = envHelpers.getDevBevFolder("UWP");
  const resTargetFolder = envHelpers.getDevResFolder("UWP");
  const bevProjectFolder = envHelpers.getProjectBevFolder();
  const resProjectFolder = envHelpers.getProjectResFolder();
  const bevProjectFolderList = envHelpers.getProjectBevFolderList();
  const resProjectFolderList = envHelpers.getProjectResFolderList();
  return {
    resFolderNameList, resTargetFolder, resTargetFolderList, resProjectFolder, resProjectFolderList,
    bevTargetFolder, bevTargetFolderList, bevFolderNameList, bevProjectFolder, bevProjectFolderList
  };
}

function removeFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  fileUtils.deleteAnySync(filePath);
}

function cleanBuild() {
  const {bevTargetFolderList, resTargetFolderList} = getEnvVars();
  console.log("[Bedrock Builder]Clean Bev Folder...");
  bevTargetFolderList.forEach((folder) => removeFile(folder));
  console.log("[Bedrock Builder]Bev Folder Cleaned.")
  console.log("[Bedrock Builder]Clean Res Folder...");
  resTargetFolderList.forEach((folder) => removeFile(folder));
  console.log("[Bedrock Builder]Res Folder Cleaned.");
}

async function runWebpack() {
  console.log("[Bedrock Builder]Building...");
  const {bevProjectFolderList} = getEnvVars();
  const webpackPromiseList = bevProjectFolderList.map((folder, index) => {
    return new Promise((resolve) => {
      const scriptFolder = path.resolve(folder, "scripts");
      const scriptPackageJson = path.resolve(scriptFolder, "package.json");
      if (!fs.existsSync(scriptPackageJson)) {
        resolve(undefined);
        return;
      }
      console.log(scriptFolder)
      exec('npx webpack', {cwd: scriptFolder}, (error, stdout, stderr) => {
        // if (error) {
        //   console.error(`Webpack error: ${error}`);
        //   return;
        // }
        console.error(`${stdout}`);
        console.error(`${stderr}`);
        resolve(undefined);
      });
    });
  });
  await Promise.all(webpackPromiseList);
  console.log("[Bedrock Builder]Webpack Completed.");
}

async function copyPacks(folderNameList: string[], projectFolder: string, targetFolder: string, isBevPack = false) {
  const promiseList = folderNameList.map(async (folderName, index) => {
    const src = path.resolve(projectFolder, folderName);
    const dest = path.resolve(targetFolder, folderName);
    await fileUtils.copyFolder(src, dest);
    // const outputFolderName = envHelpers.getScriptOutputFolderName();
    // if (isBevPack) {
    //   const scriptSrc = path.resolve(src, 'scripts', outputFolderName)
    //   const scriptDest = path.resolve(dest, 'scripts', outputFolderName);
    //   if (fs.existsSync(scriptSrc)) {
    //     await fileUtils.copyFolder(scriptSrc, scriptDest);
    //   }
    // }
    console.log(`[Bedrock Builder]Copied ${folderName} to ${dest}`);
  });
  await Promise.all(promiseList);
  console.log("[Bedrock Builder]Packs Copied.")
}

function copyBevPacks() {
  const {bevTargetFolder, bevFolderNameList, bevProjectFolder} = getEnvVars();
  copyPacks(bevFolderNameList, bevProjectFolder, bevTargetFolder, true);
}

function copyResPacks() {
  const {resTargetFolder, resFolderNameList, resProjectFolder} = getEnvVars();
  copyPacks(resFolderNameList, resProjectFolder, resTargetFolder);
}

async function deployBevPack() {
  await runWebpack();
  copyBevPacks();
}

function deployResPack() {
  copyResPacks();
}

async function deployScript() {
  const {bevProjectFolder, bevTargetFolder} = getEnvVars();
  const buildFolder = path.resolve(__dirname, "build");
  const scriptBindFolderName = envHelpers.getScriptBindFolderName();
  const destFolder = path.resolve(bevTargetFolder, scriptBindFolderName, "scripts");
  await copyFolder(buildFolder, destFolder);
}

task("deploy-scripts", () => {
  logger.info("Start build script file...")
  return webpackTask({
    config: './webpack.config.js',
    async onCompile(err, stats) {
      if (!err && !stats.hasErrors()) {
        logger.info('\nBuild completed, deploying to output...');
        await deployScript();
      } else {
        logger.error(err);
      }
      logger.info("Pack script files completed")
    }
  })
});

task("build-scripts", () => {
  logger.info("Start build script file...")
  return webpackTask({
    config: './webpack.config.js',
    async onCompile(err, stats) {
      if (!err && !stats.hasErrors()) {
        logger.info('\nBuild completed, deploying to output...');
      } else {
        logger.error(err);
      }
      logger.info("Pack script files completed")
    }
  })
});

task("deploy-packs", async (done) => {
  deployResPack();
  await deployBevPack();
  done();
});

task("clean", () => {
  cleanBuild();
});

task("dev", series("clean", "deploy-packs", "deploy-scripts"))
task("dev-no-scripts", series("clean", "deploy-packs"))

// function genPackArchiverPromiseList(folderNameList: string[], projectFolderPath: string) {
//   return folderNameList.map((folderName) => {
//     const zip = archiver.create("zip", {zlib: {level: 9}});
//     const folder = path.resolve(projectFolderPath, folderName);
//     const stream = fs.createWriteStream(path.resolve(projectFolderPath, `${folderName}.zip`));
//     return new Promise((resolve, reject) => {
//       stream.on('close', function () {
//         console.log(`zipped ${zip.pointer()} total bytes.`);
//         resolve(undefined);
//       });
//       zip.pipe(stream);
//       zip.directory(folder, false);
//       zip.finalize();
//     });
//   });
// }

// function genBevPack() {
//   const {
//     bevProjectFolderList, bevFolderNameList, bevProjectFolder,
//     resFolderNameList, resProjectFolderList, resProjectFolder
//   } = getEnvVars();
//   const bevPromiseList = genPackArchiverPromiseList(bevFolderNameList, bevProjectFolder);
//   const resPromiseList = genPackArchiverPromiseList(resFolderNameList, resProjectFolder);
//   const promiseList = bevPromiseList.concat(resPromiseList);
//   Promise.all(promiseList).then(() => {
//     console.log("[Bedrock Builder]Pack Finished.");
//   });
// }