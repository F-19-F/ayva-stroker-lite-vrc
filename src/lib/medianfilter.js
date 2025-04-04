class MedianFilter {
  constructor(windowSize = 5) {
    this.windowSize = windowSize;
    this.buffers = {
      x: [],
      y: [],
      z: [],
      roll: [],
      pitch: [],
      yaw: []
    };
  }

  // 计算中位数
  static median(arr) {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // 处理新数据
  filter (data) {
    const filteredData = {};
    Object.keys(this.buffers).forEach((key) => {
      this.buffers[key].push(data[key]); // 添加新数据
      if (this.buffers[key].length > this.windowSize) {
        this.buffers[key].shift(); // 维持窗口大小
      }
      filteredData[key] = MedianFilter.median(this.buffers[key]);
    });

    return filteredData;
  }
}

export default MedianFilter;
