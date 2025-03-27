import fs from 'fs';
import {WriteFileOptions} from 'fs';
import path from "path";


  /**
   * 创建文件夹
   */
  export function mkdirsSync(filepath: string): void {
    if (!fs.existsSync(filepath)) {
      fs.mkdirSync(filepath, {recursive: true});
    }
  }

  /**
   * 创建文件夹
   */
  export function mkdirSync(filepath: string): void {
    if (!fs.existsSync(filepath)) {
      fs.mkdirSync(filepath);
    }
  }

export function deleteSync(filePath: string): void {
    fs.unlinkSync(filePath);
  }

  /**
   * 创建文件
   */
  export function createFileSync(fileName: string, folderPath: string, fileData: string | NodeJS.ArrayBufferView, encoding?: WriteFileOptions): void {
    if (!fs.existsSync(folderPath)) {
      mkdirSync(folderPath);
    }
    fs.writeFileSync(folderPath + '\\' + fileName, fileData, encoding);
  }

export function deleteAnySync(filePath: string): void {
    if (fs.statSync(filePath).isDirectory()) {
      deleteFolderRecursiveSync(filePath);
    } else {
      fs.unlinkSync(filePath);
    }
  }

export function deleteFolderRecursiveSync(path: string): void {
    if (!fs.existsSync(path)) {
      return;
    }
    fs.readdirSync(path).forEach((file) => {
      const curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursiveSync(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }

export async function  copyFolder(sourcePath: string, targetPath: string, excludeList: string[] = []) {
    return new Promise((resolve) => {
      fs.readdir(sourcePath, (err, files) => {
        if (err) {
          console.error(`读取目录错误: ${err}`);
          return;
        }

        // 创建目标文件夹（如果不存在）
        fs.mkdir(targetPath, {recursive: true}, (err) => {
          if (err) {
            console.error(`创建目录错误: ${err}`);
            return;
          }

          // 复制文件夹内的每个文件
          files.forEach((file, index) => {
            if (excludeList.includes(file)) {
              return;
            }
            const sourceFilePath = path.join(sourcePath, file);
            const targetFilePath = path.join(targetPath, file);

            fs.stat(sourceFilePath, (err, stat) => {
              if (err) {
                console.error(`统计文件错误: ${err}`);
                return;
              }

              if (stat.isDirectory()) {
                // 如果是文件夹，则递归复制
                copyFolder(sourceFilePath, targetFilePath);
              } else {
                // 如果是文件，则直接复制
                fs.copyFile(sourceFilePath, targetFilePath, (err) => {
                  if (err) {
                    console.error(`复制文件错误: ${err}`);
                    return;
                  }
                  // console.log(`文件 ${file} 已复制`);
                });
              }

              // 当所有文件都复制完成后
              if (index === files.length - 1) {
                // console.log('文件夹复制完成');
                resolve(undefined);
              }
            });
          });
        });
      });
    });
  }

export function removeChildFilesExclude(folderPath: string, excludeList: string[]) {
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      return;
    }
    console.log(`[Bedrock Builder]Start remove child files of ${folderPath}...`)
    const children = fs.readdirSync(folderPath);
    children.forEach((child) => {
      if (excludeList.includes(child)) {
        return;
      }
      const childPath = path.resolve(folderPath, child);
      deleteAnySync(childPath);
    });
    console.log("[Bedrock Builder]Child files removed.")
  }