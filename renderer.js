// 全局变量
let selectedFile = null;
let csvContent = null;
let csvHeader = null;
let csvRows = null;
let filePath = null;
let dropArea, fileInput, selectFileBtn, splitBtn, rowsPerFile, fileInfo, resultArea, progressBar, resultMessage;

// 处理从超级面板导入的文件
function handleImportedFile(fileData) {
  try {
    // 确保DOM元素已经加载
    if (!dropArea) {
      dropArea = document.getElementById('dropArea');
      fileInfo = document.getElementById('fileInfo');
      splitBtn = document.getElementById('splitBtn');
      rowsPerFile = document.getElementById('rowsPerFile');
    }
    
    if (!dropArea || !fileInfo || !splitBtn || !rowsPerFile) {
      // 等待DOM加载完成后再次尝试
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          handleImportedFile(fileData);
        });
      }
      return;
    }
    
    selectedFile = {
      name: fileData.name,
      size: fileData.size,
      type: 'text/csv'
    };
    
    filePath = fileData.path;
    csvContent = fileData.content;
    
    // 显示文件信息
    const fileNameElement = document.createElement('p');
    fileNameElement.textContent = `已选择文件: ${fileData.name}`;
    fileNameElement.style.fontWeight = 'bold';
    fileNameElement.style.marginTop = '10px';
    
    // 清除之前的文件名显示
    const existingFileNames = dropArea.querySelectorAll('p:not(:first-child)');
    existingFileNames.forEach(el => el.remove());
    
    dropArea.appendChild(fileNameElement);
    
    // 解析CSV内容
    parseCSV(csvContent);
    
    if (!csvHeader || !csvRows || csvRows.length === 0) {
      alert('CSV文件解析失败或文件为空，请检查文件格式');
      return;
    }
    
    // 显示文件信息
    fileInfo.innerHTML = `
      <p>文件名: ${fileData.name}</p>
      <p>文件大小: ${formatFileSize(fileData.size)}</p>
      <p>总行数: ${csvRows.length + 1} (含表头)</p>
      <p>数据行数: ${csvRows.length}</p>
      <p class="info-text">文件来源: 超级面板导入</p>
    `;
    
    // 设置默认每份行数为总行数的1/10，最小为1000，最大为10000
    const suggestedRowsPerFile = Math.min(Math.max(Math.round(csvRows.length / 10), 1000), 10000);
    rowsPerFile.value = suggestedRowsPerFile;
    
    // 启用拆分按钮
    splitBtn.disabled = false;
  } catch (error) {
    alert(`处理文件时出错: ${error.message}`);
  }
}

// 解析CSV
function parseCSV(content) {
  const lines = content.split(/\r\n|\n/);
  csvHeader = lines[0];
  csvRows = lines.slice(1).filter(line => line.trim() !== '');
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 直接在页面中监听uTools的onPluginEnter事件
// 这必须在DOMContentLoaded之前设置，以确保不会错过任何事件
if (window.utools) {
  window.utools.onPluginEnter(({ code, type, payload }) => {
    // 处理从超级面板传入的文件
    if (type === 'files' && payload && payload.length > 0) {
      const file = payload[0];
      
      if (file.isFile && file.path.toLowerCase().endsWith('.csv')) {
        // 从文件系统读取CSV文件
        const fileData = window.utils.readCSVFromFileSystem(file.path);
        if (fileData) {
          // 处理导入的文件
          handleImportedFile(fileData);
        }
      } else {
        window.utools.showNotification('请选择CSV文件');
      }
    }
    
    // 处理从其他方式传入的文件路径
    if (type === 'imported' && payload) {
      // 从文件系统读取CSV文件
      const fileData = window.utils.readCSVFromFileSystem(payload);
      if (fileData) {
        handleImportedFile(fileData);
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // 初始化DOM元素引用
  dropArea = document.getElementById('dropArea');
  fileInput = document.getElementById('fileInput');
  selectFileBtn = document.getElementById('selectFileBtn');
  splitBtn = document.getElementById('splitBtn');
  rowsPerFile = document.getElementById('rowsPerFile');
  fileInfo = document.getElementById('fileInfo');
  resultArea = document.getElementById('resultArea');
  progressBar = document.getElementById('progressBar');
  resultMessage = document.getElementById('resultMessage');

  // 检查是否有从超级面板导入的文件
  checkImportedFile();

  // 点击选择文件按钮
  selectFileBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // 文件选择变化
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      // 前置显示uTools窗口
      window.utils.showMainWindow();
      
      // 延迟一点处理文件，确保窗口已经前置
      setTimeout(() => {
        handleFile(e.target.files[0]);
      }, 200);
    }
  });

  // 拖拽事件
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // 拖拽样式
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
      dropArea.style.borderColor = '#4a89dc';
      dropArea.style.backgroundColor = '#f9f9f9';
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
      dropArea.style.borderColor = '#ccc';
      dropArea.style.backgroundColor = 'transparent';
    }, false);
  });

  // 处理拖放文件
  dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
      // 前置显示uTools窗口
      window.utils.showMainWindow();
      
      handleFile(files[0]);
    }
  }, false);

  // 检查是否有从超级面板导入的文件
  function checkImportedFile() {
    const importedFilePath = window.utils.getImportedFilePath();
    
    if (importedFilePath) {
      // 清除导入的文件路径，避免重复处理
      window.utils.clearImportedFilePath();
      
      // 从文件系统读取CSV文件
      const fileData = window.utils.readCSVFromFileSystem(importedFilePath);
      
      if (fileData) {
        // 前置显示uTools窗口
        window.utils.showMainWindow();
        
        // 处理导入的文件
        handleImportedFile(fileData);
      }
    }
    
    // 定期检查是否有新的导入文件（作为备用方案）
    setInterval(() => {
      const newImportedFilePath = window.utils.getImportedFilePath();
      if (newImportedFilePath) {
        // 清除导入的文件路径，避免重复处理
        window.utils.clearImportedFilePath();
        
        // 从文件系统读取CSV文件
        const fileData = window.utils.readCSVFromFileSystem(newImportedFilePath);
        if (fileData) {
          // 处理导入的文件
          handleImportedFile(fileData);
        }
      }
    }, 1000); // 每秒检查一次
  }
  
  // 处理文件
  function handleFile(file) {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('请选择CSV文件！');
      return;
    }

    selectedFile = file;
    
    // 尝试获取文件路径
    filePath = window.utils.getFilePath(file);
    
    // 显示文件信息
    const fileNameElement = document.createElement('p');
    fileNameElement.textContent = `已选择文件: ${file.name}`;
    fileNameElement.style.fontWeight = 'bold';
    fileNameElement.style.marginTop = '10px';
    
    // 清除之前的文件名显示
    const existingFileNames = dropArea.querySelectorAll('p:not(:first-child)');
    existingFileNames.forEach(el => el.remove());
    
    dropArea.appendChild(fileNameElement);

    // 读取文件内容
    const reader = new FileReader();
    reader.onload = (e) => {
      csvContent = e.target.result;
      parseCSV(csvContent);
      
      // 显示文件信息
      fileInfo.innerHTML = `
        <p>文件名: ${file.name}</p>
        <p>文件大小: ${formatFileSize(file.size)}</p>
        <p>总行数: ${csvRows.length + 1} (含表头)</p>
        <p>数据行数: ${csvRows.length}</p>
        <p class="info-text">文件来源: 手动选择</p>
      `;
      
      // 设置默认每份行数为总行数的1/10，最小为1000，最大为10000
      const suggestedRowsPerFile = Math.min(Math.max(Math.round(csvRows.length / 10), 1000), 10000);
      rowsPerFile.value = suggestedRowsPerFile;
      
      // 启用拆分按钮
      splitBtn.disabled = false;
      
      // 再次确保窗口前置
      window.utils.showMainWindow();
    };
    reader.readAsText(file);
  }
  
  // 拆分按钮点击事件
  splitBtn.addEventListener('click', () => {
    const rows = parseInt(rowsPerFile.value);
    if (isNaN(rows) || rows < 1) {
      alert('请输入有效的每份行数，至少为1');
      return;
    }

    if (!csvContent || !csvHeader || !csvRows || csvRows.length === 0) {
      alert('请先选择有效的CSV文件');
      return;
    }

    // 如果没有获取到文件路径，尝试再次获取
    if (!filePath) {
      filePath = window.utils.getFilePath(selectedFile);
      if (!filePath) {
        alert('无法获取文件路径，请重新选择文件');
        return;
      }
    }

    splitCSVByRowCount(rows);
  });

  // 按每份行数拆分CSV文件
  function splitCSVByRowCount(rowsPerFile) {
    // 显示结果区域
    resultArea.style.display = 'block';
    resultArea.classList.add('show');
    
    // 重置进度条
    progressBar.style.width = '0%';
    
    // 显示处理中信息
    resultMessage.textContent = '正在处理文件...';
    
    // 滚动到结果区域
    scrollToResults();
    
    // 计算需要拆分的文件数量
    const fileCount = Math.ceil(csvRows.length / rowsPerFile);
    
    // 准备文件数组
    const files = [];
    
    // 使用setTimeout来避免UI阻塞
    setTimeout(() => {
      processFiles(0, fileCount, rowsPerFile, files);
    }, 100);
  }

  // 处理文件
  function processFiles(index, fileCount, rowsPerFile, files) {
    if (index >= fileCount) {
      // 所有文件处理完成，保存文件
      progressBar.style.width = '100%';
      resultMessage.textContent = `拆分完成，正在保存 ${fileCount} 个文件...`;
      
      // 保存文件
      setTimeout(() => {
        saveFiles(files);
      }, 100);
      return;
    }
    
    // 更新进度条
    const progress = Math.round((index / fileCount) * 100);
    progressBar.style.width = `${progress}%`;
    
    // 更新状态信息
    resultMessage.textContent = `正在处理第 ${index + 1}/${fileCount} 个文件...`;
    
    // 计算当前文件的行范围
    const startRow = index * rowsPerFile;
    const endRow = Math.min(startRow + rowsPerFile, csvRows.length);
    
    // 提取当前文件的行
    const currentRows = csvRows.slice(startRow, endRow);
    
    // 添加表头
    const fileContent = csvHeader + '\n' + currentRows.join('\n');
    
    // 生成文件名
    const fileName = getFileNameWithoutExtension(selectedFile.name) + `_part${index + 1}.csv`;
    
    // 添加到文件数组
    files.push({
      name: fileName,
      content: fileContent
    });
    
    // 处理下一个文件
    setTimeout(() => {
      processFiles(index + 1, fileCount, rowsPerFile, files);
    }, 10);
  }

  // 获取不带扩展名的文件名
  function getFileNameWithoutExtension(fileName) {
    return fileName.replace(/\.[^/.]+$/, "");
  }

  // 保存文件
  function saveFiles(files) {
    try {
      // 保存文件到文件系统
      const result = window.utils.saveFilesToFolder(files, filePath);
      
      if (result.success) {
        resultMessage.innerHTML = `
          <p>拆分完成！已成功保存 ${result.fileCount} 个文件到以下文件夹：</p>
          <div class="folder-path">${result.folderPath}</div>
          <button class="btn" id="openFolderBtn" style="margin-top: 15px;">打开文件夹</button>
        `;
        
        // 添加打开文件夹按钮事件
        document.getElementById('openFolderBtn').addEventListener('click', () => {
          window.utils.openFolder(result.folderPath);
        });
        
        // 再次滚动到结果区域，确保用户能看到完整结果
        scrollToResults();
        
        // 确保窗口前置
        window.utils.showMainWindow();
      } else {
        resultMessage.textContent = `保存文件时出错: ${result.error}`;
      }
    } catch (error) {
      resultMessage.textContent = `保存文件时出错: ${error.message}`;
    }
  }
  
  // 滚动到结果区域
  function scrollToResults() {
    // 使用平滑滚动效果
    resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // 添加高亮动画效果
    resultArea.classList.remove('show');
    void resultArea.offsetWidth; // 触发重绘
    resultArea.classList.add('show');
  }
});