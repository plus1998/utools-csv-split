// preload.js
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

window.exports = {
  "csv-split": {
    mode: "window",
    args: {
      enter: (action) => {
        // 插件装载时调用
        window.utools.setExpendHeight(600);
        window.utools.setSubInput(({ text }) => {
          // 可以在这里处理搜索框输入
        }, '搜索或输入命令');
        
        // 检查是否有从超级面板传递的文件
        if (action.type === 'imported' && action.payload) {
          window.importedFilePath = action.payload;
        }
        
        // 检查是否有从超级面板传递的文件
        if (action.type === 'files' && action.payload && action.payload.length > 0) {
          const file = action.payload[0];
          if (file.isFile && file.path.toLowerCase().endsWith('.csv')) {
            window.importedFilePath = file.path;
          }
        }
      },
      search: (action, searchWord, callbackSetList) => {
        // 用户在搜索框输入时调用
        return callbackSetList([]);
      },
      select: (action, itemData, callbackSetList) => {
        // 用户选择列表中某个条目时调用
        window.utools.hideMainWindow();
      },
      placeholder: "CSV拆分工具"
    }
  },
  // 添加超级面板功能
  "csv-split-panel": {
    mode: "none",
    args: {
      enter: (action, callbackSetList) => {
        // 从超级面板进入时的处理
        if (action.type === 'files' && action.payload && action.payload.length > 0) {
          // 获取文件路径
          const filePath = action.payload[0].path;
          
          // 检查是否为CSV文件
          if (filePath.toLowerCase().endsWith('.csv')) {
            // 将文件路径保存到全局变量，供渲染进程使用
            window.importedFilePath = filePath;
            
            // 直接打开主窗口，不使用redirect
            window.utools.hideMainWindow();
            
            // 使用redirect打开主窗口并传递文件路径
            window.utools.redirect('csv-split', '', { type: 'files', payload: action.payload });
            
            // 确保窗口显示
            setTimeout(() => {
              window.utools.showMainWindow();
              window.utools.setExpendHeight(600);
            }, 100);
          } else {
            // 不是CSV文件，显示错误提示
            window.utools.showNotification('请选择CSV文件');
          }
        }
      }
    }
  }
};

// 暴露一些常用的API给渲染进程
window.utools = window.utools || {};

// 检测文件编码
function detectFileEncoding(buffer) {
  // 检测BOM标记
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return 'utf8';
  }
  
  // 检测UTF-16LE BOM
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return 'utf16le';
  }
  
  // 检测UTF-16BE BOM
  if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    return 'utf16be';
  }
  
  // 初步检测是否包含中文字符
  let hasChineseChar = false;
  for (let i = 0; i < Math.min(buffer.length, 1000); i++) {
    // 检测常见中文Unicode范围
    if (buffer[i] >= 0x80) {
      hasChineseChar = true;
      break;
    }
  }
  
  // 如果包含中文字符，优先使用GBK
  if (hasChineseChar) {
    // 尝试转换一小部分内容看是否有乱码
    try {
      const utf8Sample = iconv.decode(buffer.slice(0, Math.min(buffer.length, 100)), 'utf8');
      // 检查转换后的UTF-8字符串是否包含替换字符
      if (!utf8Sample.includes('')) {
        return 'utf8';
      }
      
      // 尝试GBK解码
      const gbkSample = iconv.decode(buffer.slice(0, Math.min(buffer.length, 100)), 'gbk');
      if (!gbkSample.includes('')) {
        return 'gbk';
      }
    } catch (e) {
      // 解码失败，默认使用GBK
      return 'gbk';
    }
    
    // 默认返回GBK，因为中文Windows系统常用编码
    return 'gbk';
  }
  
  // 没有特殊标记且没有中文字符，默认使用UTF-8
  return 'utf8';
}

// 添加一些工具函数
window.utils = {
  // 保存文件到指定目录
  saveFilesToFolder: (files, originalFilePath) => {
    try {
      // 获取原始文件所在目录
      const originalDir = path.dirname(originalFilePath);
      const originalFileName = path.basename(originalFilePath, path.extname(originalFilePath));
      
      // 创建输出文件夹
      const outputFolderName = `${originalFileName}_split_${new Date().getTime()}`;
      const outputFolderPath = path.join(originalDir, outputFolderName);
      
      // 如果文件夹不存在，则创建
      if (!fs.existsSync(outputFolderPath)) {
        fs.mkdirSync(outputFolderPath, { recursive: true });
      }
      
      // 获取原始文件的编码
      const fileEncoding = window.fileEncoding || 'utf8';
      
      // 保存所有文件
      const savedFiles = [];
      files.forEach(file => {
        const filePath = path.join(outputFolderPath, file.name);
        
        // 使用检测到的原始文件编码保存拆分后的文件
        let buffer;
        if (fileEncoding !== 'utf8') {
          // 如果不是UTF-8，需要先转换
          buffer = iconv.encode(file.content, fileEncoding);
          fs.writeFileSync(filePath, buffer);
        } else {
          // 如果是UTF-8，直接写入
          fs.writeFileSync(filePath, file.content, { encoding: fileEncoding });
        }
        
        savedFiles.push(filePath);
      });
      
      // 返回保存结果
      return {
        success: true,
        folderPath: outputFolderPath,
        fileCount: savedFiles.length,
        encoding: fileEncoding
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // 打开文件夹
  openFolder: (folderPath) => {
    window.utools.shellOpenPath(folderPath);
  },
  
  // 读取文件内容
  readFile: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  },
  
  // 获取文件路径
  getFilePath: (file) => {
    // 使用uTools API获取文件路径
    if (file && file.path) {
      return file.path;
    }
    
    // 尝试使用其他方法获取文件路径
    if (window.utools && window.utools.showOpenDialog) {
      const result = window.utools.showOpenDialog({
        title: '选择保存位置',
        defaultPath: file ? file.name : 'untitled.csv',
        buttonLabel: '保存'
      });
      
      if (result && result.length > 0) {
        return result[0];
      }
    }
    
    return null;
  },
  
  // 前置显示uTools窗口
  showMainWindow: () => {
    if (window.utools) {
      // 显示主窗口
      window.utools.showMainWindow();
      
      // 设置窗口置顶
      setTimeout(() => {
        try {
          // 尝试使用setExpendHeight触发窗口刷新和前置
          const currentHeight = window.utools.getExpendHeight();
          window.utools.setExpendHeight(currentHeight);
        } catch (e) {
          // 忽略错误
        }
      }, 100);
    }
  },
  
  // 从文件系统读取CSV文件
  readCSVFromFileSystem: (filePath) => {
    try {
      if (!filePath) {
        return null;
      }
      
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      // 读取文件内容为Buffer，以便检测编码
      const buffer = fs.readFileSync(filePath);
      
      // 检测文件编码
      const encoding = detectFileEncoding(buffer);
      
      // 保存检测到的编码，以便后续写入时使用
      window.fileEncoding = encoding;
      
      // 根据检测到的编码解码内容
      const content = iconv.decode(buffer, encoding);
      
      // 获取文件信息
      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      
      return {
        name: fileName,
        path: filePath,
        content: content,
        size: stats.size,
        encoding: encoding
      };
    } catch (error) {
      return null;
    }
  },
  
  // 获取从超级面板导入的文件路径
  getImportedFilePath: () => {
    return window.importedFilePath || null;
  },
  
  // 清除导入的文件路径
  clearImportedFilePath: () => {
    window.importedFilePath = null;
  },
  
  // 获取当前检测到的文件编码
  getFileEncoding: () => {
    return window.fileEncoding || 'utf8';
  }
}; 