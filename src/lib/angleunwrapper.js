class RealTimeAngleUnwrapper {
  constructor (threshold = 180) {
    this.lastAngle = null;
    this.cumulativeAngle = 0;
    this.threshold = threshold;
  }

  unwrap (angle) {
    if (this.lastAngle === null) {
      this.lastAngle = angle;
      this.cumulativeAngle = angle;
      return angle;
    }

    let diff = angle - this.lastAngle;

    if (diff > this.threshold) {
      diff -= 2 * this.threshold;
    } else if (diff < -this.threshold) {
      diff += 2 * this.threshold;
    }

    this.cumulativeAngle += diff;
    this.lastAngle = angle;

    return this.cumulativeAngle;
  }
}

export default RealTimeAngleUnwrapper;
