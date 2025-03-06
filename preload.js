// preload.js
const fs = require('fs');
const path = require('path');

window.exports = {
  "csv-split": {
    mode: "window",
    args: {
      enter: (action) => {
        // 插件装载时调用
        console.log('CSV拆分工具已启动');
        window.utools.setExpendHeight(600);
        window.utools.setSubInput(({ text }) => {
          // 可以在这里处理搜索框输入
        }, '搜索或输入命令');
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
      console.error('保存文件时出错:', error);
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
    if (file.path) {
      return file.path;
    }
    
    // 尝试使用其他方法获取文件路径
    if (window.utools && window.utools.showOpenDialog) {
      const result = window.utools.showOpenDialog({
        title: '选择保存位置',
        defaultPath: file.name,
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
          console.error('设置窗口置顶失败:', e);
        }
      }, 100);
    }
  }
}; 