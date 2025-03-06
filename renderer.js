document.addEventListener('DOMContentLoaded', () => {
  const dropArea = document.getElementById('dropArea');
  const fileInput = document.getElementById('fileInput');
  const selectFileBtn = document.getElementById('selectFileBtn');
  const splitBtn = document.getElementById('splitBtn');
  const rowsPerFile = document.getElementById('rowsPerFile');
  const fileInfo = document.getElementById('fileInfo');
  const resultArea = document.getElementById('resultArea');
  const progressBar = document.getElementById('progressBar');
  const resultMessage = document.getElementById('resultMessage');

  let selectedFile = null;
  let csvContent = null;
  let csvHeader = null;
  let csvRows = null;
  let filePath = null;

  // 点击选择文件按钮
  selectFileBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // 文件选择变化
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
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
      handleFile(files[0]);
    }
  }, false);

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
      `;
      
      // 设置默认每份行数为总行数的1/10，最小为1000，最大为10000
      const suggestedRowsPerFile = Math.min(Math.max(Math.round(csvRows.length / 10), 1000), 10000);
      rowsPerFile.value = suggestedRowsPerFile;
      
      // 启用拆分按钮
      splitBtn.disabled = false;
    };
    reader.readAsText(file);
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
    progressBar.style.width = '0%';
    resultMessage.textContent = '正在处理...';
    
    // 滚动到结果区域
    scrollToResults();

    // 计算需要拆分的文件数量
    const totalRows = csvRows.length;
    const fileCount = Math.ceil(totalRows / rowsPerFile);
    
    // 创建拆分后的文件
    const files = [];
    
    // 使用setTimeout来避免UI阻塞，并显示进度条动画
    setTimeout(() => {
      processFiles(0, fileCount, rowsPerFile, files);
    }, 100);
  }
  
  // 分批处理文件，避免UI阻塞
  function processFiles(index, fileCount, rowsPerFile, files) {
    const totalRows = csvRows.length;
    const batchSize = 5; // 每批处理的文件数
    const endIndex = Math.min(index + batchSize, fileCount);
    
    for (let i = index; i < endIndex; i++) {
      const start = i * rowsPerFile;
      const end = Math.min(start + rowsPerFile, totalRows);
      
      if (start >= totalRows) break;
      
      // 提取当前分片的行
      const currentRows = csvRows.slice(start, end);
      
      // 添加表头
      const fileContent = csvHeader + '\n' + currentRows.join('\n');
      
      // 创建文件名
      const fileName = getFileNameWithoutExtension(selectedFile.name) + `_part${i+1}.csv`;
      
      files.push({
        name: fileName,
        content: fileContent
      });
      
      // 更新进度条
      const progress = Math.min(((i + 1) / fileCount) * 100, 100);
      progressBar.style.width = `${progress}%`;
    }
    
    if (endIndex < fileCount) {
      // 继续处理下一批
      setTimeout(() => {
        processFiles(endIndex, fileCount, rowsPerFile, files);
      }, 0);
    } else {
      // 所有文件处理完毕，保存文件
      saveFiles(files);
    }
  }

  // 获取不带扩展名的文件名
  function getFileNameWithoutExtension(fileName) {
    return fileName.replace(/\.[^/.]+$/, "");
  }

  // 保存文件
  function saveFiles(files) {
    // 使用preload.js中定义的工具函数保存文件到文件夹
    try {
      const result = window.utils.saveFilesToFolder(files, filePath);
      
      if (result.success) {
        resultMessage.innerHTML = `
          <p>成功将CSV文件拆分为<strong>${files.length}</strong>份，每份包含<strong>${rowsPerFile.value}</strong>行数据(最后一份可能不足)，并已保存到文件夹：</p>
          <div class="folder-path">${result.folderPath}</div>
          <button class="btn" id="openFolderBtn" style="margin-top: 15px;">打开文件夹</button>
        `;
        
        // 添加打开文件夹按钮事件
        document.getElementById('openFolderBtn').addEventListener('click', () => {
          window.utils.openFolder(result.folderPath);
        });
        
        // 再次滚动到结果区域，确保用户能看到完整结果
        scrollToResults();
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