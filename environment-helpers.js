/*
    Helper functions to extract variables from the .env file and inject them
    into the compilation and configuration process
*/

import {logger} from "just-scripts";

const path = require("node:path");
const fs = require("node:fs");

require("dotenv").config();

export function expandVariablesWithEnvironmentVariables(inputString) {
  // find/replace all expandable variables '{VAR_NAME}' and replace them
  // with the ones defined in the .env file
  const variableRegExp = /{([A-Z|_|0-9]+)}/g;
  let match = variableRegExp.exec(inputString);
  if (!match) {
    throw "The input string did not have any expansion variables";
  }
  while (match) {
    if (match.length >= 1) {
      const unresolvedEnvVar = match[1];
      const resolvedEnvVar = process.env[unresolvedEnvVar];
      if (resolvedEnvVar) {
        inputString = inputString.replace(match[0], resolvedEnvVar);
      } else {
        throw (
          `Unable to resolve environment variable ["${unresolvedEnvVar}"] in input string ["${inputString}"]`
        );
      }
    }
    match = variableRegExp.exec(inputString);
  }
  return inputString;
}

// export function shouldGenerateResourcePack() {
//   var requirement = process.env.MC_EXTENSION_GENERATE_RESOURCE_PACK;
//   if(!requirement) {
//     return false;
//   }
//   requirement = requirement.toLowerCase();
//   if(requirement === 'yes' || requirement === '1' || requirement === 'true') {
//     return true;
//   }
//   else if( requirement === 'no' || requirement === '0' || requirement === 'false') {
//     return false;
//   }
//   throw 'MC_EXTENSION_GENERATE_RESOURCE_PACK in .env is set to an invalid value [' + requirement + ']';
// }

export function getProjectName() {
  const projectName = process.env.PROJECT_NAME;
  if (!projectName) {
    throw "Unable to resolve Project Name from .env file";
  }
  return projectName;
}

export function getBevFolderName(packFolderName) {
  return packFolderName + "[BP]";
}

export function getBevFolderNameList() {
  return fs.readdirSync(getProjectBevFolder());
}

export function getResFolderNameList() {
  return fs.readdirSync(getProjectResFolder());
}

export function getProjectBevFolderList() {
  const behaviorPackNameList = getBevFolderNameList();
  const rootFolder = getProjectBevFolder();
  return behaviorPackNameList.map(
    (name) => path.resolve(rootFolder, name)
  );
}

export function getProjectResFolderList() {
  const behaviorPackNameList = getResFolderNameList();
  const rootFolder = getProjectResFolder();
  return behaviorPackNameList.map(
    (name) => path.resolve(rootFolder, name)
  );
}

export function getDevBevFolder(exePrefix) {
  const rootFolder = getMinecraftDataFolder(exePrefix);
  return path.resolve(rootFolder, 'development_behavior_packs');
}

export function getDevResFolder(exePrefix) {
  const rootFolder = getMinecraftDataFolder(exePrefix);
  return path.resolve(rootFolder, 'development_resource_packs');
}

export function getDevBevFolderList(exePrefix) {
  const behaviorPackNameList = getBevFolderNameList();
  const rootFolder = getMinecraftDataFolder(exePrefix);
  return behaviorPackNameList.map(
    (name) => path.resolve(rootFolder, 'development_behavior_packs', name)
  );
}

export function getDevResFolderList(exePrefix) {
  const resourcePackNameList = getResFolderNameList();
  const rootFolder = getMinecraftDataFolder(exePrefix);
  return resourcePackNameList.map(
    (name) => path.resolve(rootFolder, 'development_resource_packs', name)
  );
}

function parseBoolean(str) {
  if (str === 'false') {
    return false;
  }
  if (str === 'true') {
    return true;
  }
  if (str === '0') {
    return false;
  }
  if (str === '1') {
    return true;
  }
  throw Error("Unable to parse boolean value [" + str + "]");
}

export function getMinecraftDataFolder(exePrefix) {
  const isPreview = parseBoolean(process.env.IS_PREVIEW ?? 'false');
  let outputDir = process.env["PACK_ROOT_PATH_" + exePrefix + (isPreview ? "_PREVIEW" : "")];
  if (!outputDir) {
    throw "Unable to resolve MC_PACK_ROOT_" + exePrefix + " output path from .env file";
  }

  // Expand any environment variables
  outputDir = expandVariablesWithEnvironmentVariables(outputDir);
  logger.info("Output to minecraft directory: " + outputDir);
  return outputDir;
}

export function getProjectBevFolder() {
  const outputDir = path.resolve(__dirname, "behavior_packs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, {recursive: true});
  }
  return outputDir;
}

export function getProjectResFolder() {
  const outputDir = path.resolve(__dirname, "resource_packs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, {recursive: true});
  }
  return outputDir;
}

export function getScriptOutputFolderName() {
  const scriptOutputDir = process.env.SCRIPT_OUTPUT_DIR;
  if (!scriptOutputDir) {
    throw "Unable to resolve SCRIPT_OUTPUT_DIR from .env file";
  }
  return scriptOutputDir;
}

export function getScriptEntry() {
  const scriptEntry = process.env.SCRIPT_ENTRY;
  if (!scriptEntry) {
    throw "Unable to resolve SCRIPT_ENTRY from .env file";
  }
  return scriptEntry;
}

export function getScriptBindFolderName() {
  const scriptBindPackName = process.env.SCRIPT_BIND_PACK_NAME;
  if (!scriptBindPackName) {
    throw "Unable to resolve SCRIPT_BIND_PACK_NAME from .env file";
  }
  return getBevFolderName(scriptBindPackName);
}
