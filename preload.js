// preload.js
const fs = require('fs');
const path = require('path');

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
      
      // 保存所有文件
      const savedFiles = [];
      files.forEach(file => {
        const filePath = path.join(outputFolderPath, file.name);
        fs.writeFileSync(filePath, file.content);
        savedFiles.push(filePath);
      });
      
      // 返回保存结果
      return {
        success: true,
        folderPath: outputFolderPath,
        fileCount: savedFiles.length
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
      
      // 读取文件内容
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // 获取文件信息
      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      
      return {
        name: fileName,
        path: filePath,
        content: content,
        size: stats.size
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
  }
}; 