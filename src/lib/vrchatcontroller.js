import {
  GeneratorBehavior
} from 'ayvajs';

import { eventMixin } from './util.js';
import Storage from './ayva-storage.js';

const storage = new Storage('vrc');
class VRChatController extends GeneratorBehavior {
  constructor () {
    super();
    const saveddata = storage.load('minmax');
    if (saveddata) {
      console.log('load saved data');
      this.max_x = saveddata.max_x;
      this.min_x = saveddata.min_x;
      this.max_y = saveddata.max_y;
      this.min_y = saveddata.min_y;
      this.max_z = saveddata.max_z;
      this.min_z = saveddata.min_z;
      this.max_roll = saveddata.max_roll;
      this.min_roll = saveddata.min_roll;
      this.max_pitch = saveddata.max_pitch;
      this.min_pitch = saveddata.min_pitch;
      this.max_yaw = saveddata.max_yaw;
      this.min_yaw = saveddata.min_yaw;
    } else {
      this.max_x = -999;
      this.min_x = 999;
      this.max_y = -999;
      this.min_y = 999;
      this.max_z = -999;
      this.min_z = 999;
      this.max_roll = -999;
      this.min_roll = 999;
      this.max_pitch = -999;
      this.min_pitch = 999;
      this.max_yaw = -999;
      this.min_yaw = 999;
    }
    this.started = false;
    this.connect();
  }

  connect () {
    console.log("connect now!");
    this.ws = new WebSocket('ws://localhost:8000/');
    this.ws.onmessage = (event) => {
      // this.messages.push(event.data);
      const rawData = JSON.parse(event.data);
      // console.log(`data is ${event.data}`)
      this.applyData(rawData);
    };
    this.ws.onclose = () => {
      console.log('WebSocket disconnected. Reconnecting...');
      this.connect();
    };
    this.ws.onopen = function () {
      console.log('Connection is open ...');
      // this.send('Hello Server!');
    };
  }

  * generate () {
    // console.log('generate called');
    // this.ayva = ayva;
    // switch (this.#computeState(ayva)) {
    //   case STATE.TRANSITION_MANUAL:
    //     yield* this.#createTransition(ayva, this.#manualBehavior);
    //     this.#resetManualMode();

    //     break;
    //   case STATE.TRANSITION_FREE_PLAY:
    //     yield* this.#createTransition(ayva, _.sample(this.strokes));

    //     break;
    //   case STATE.STROKING:
    //     if (this.#currentBehavior instanceof TempestStroke) {
    //       yield* this.#currentBehavior;
    //     } else {
    //       yield this.#currentBehavior.next();
    //     }

    //     break;
    //   default:
    //     // Waiting for a command.
    yield 0.0165;
    // }
  }

  applyData (data) {
    if (this.reset) {
      if (data.x > this.max_x) {
        this.max_x = data.x;
      }
      if (data.y > this.max_y) {
        this.max_y = data.y;
      }
      if (data.z > this.max_z) {
        this.max_z = data.z;
      }
      if (data.x < this.min_x) {
        this.min_x = data.x;
      }
      if (data.y < this.min_y) {
        this.min_y = data.y;
      }
      if (data.z < this.min_z) {
        this.min_z = data.z;
      }
      if (data.pitch > this.max_pitch) {
        this.max_pitch = data.pitch;
      }
      if (data.yaw > this.max_yaw) {
        this.max_yaw = data.yaw;
      }
      if (data.roll > this.max_roll) {
        this.max_roll = data.roll;
      }
      if (data.pitch < this.min_pitch) {
        this.min_pitch = data.pitch;
      }
      if (data.yaw < this.min_yaw) {
        this.min_yaw = data.yaw;
      }
      if (data.roll < this.min_roll) {
        this.min_roll = data.roll;
      }
      return;
    }
    // 位置归一
    // iPhone
    // const ab_l = 0.2
    // const ab_roll = 3
    // const ab_yaw = 3
    // const maxMin = {
    //     x: {min: -ab_l, max: ab_l},
    //     y: {min: -ab_l, max: ab_l},
    //     z: {min: -ab_l, max: ab_l},
    //     pitch: {min: -3, max: 0},
    //     yaw: {min: -ab_yaw, max: ab_yaw},
    //     roll: {min: -ab_roll, max: ab_roll}
    // };
    // steamVR
    // const ab_l = 0.2
    // const ab_roll = 3
    // const ab_yaw = 3
    // const maxMin = {
    //     x: {min: -ab_l, max: ab_l},
    //     y: {min: 0.4, max: 0.8},
    //     z: {min: -ab_l, max: ab_l},
    //     pitch: {min: -2.7, max: -1.2},
    //     yaw: {min: -ab_yaw, max: ab_yaw},
    //     roll: {min: -ab_roll, max: ab_roll}
    // };
    // VRChat
    // const ab_l = 0.2
    // const ab_roll = 3
    // const ab_yaw = 3
    const maxMin = {
      x: { min: this.min_x, max: this.max_x },
      y: { min: this.min_y, max: this.max_y },
      z: { min: this.min_z, max: this.max_z },
      pitch: { min: this.min_pitch, max: this.max_pitch },
      yaw: { min: this.min_yaw, max: this.max_yaw },
      roll: { min: this.min_roll, max: this.max_roll }
    };
    // 将每个轴的值归一化到0-1
    const normalize = (value, axis) => {
      if (maxMin[axis].max === maxMin[axis].min) {
        return 0.5;
      }
      let res = (value - maxMin[axis].min) / (maxMin[axis].max - maxMin[axis].min);
      if (res < 0) {
        res = 0;
      }
      if (res > 1) {
        res = 1;
      }
      // console.log(`${axis} => ${res}`)
      return res;
    };
    // L0 stroke 上下
    // L1 surge 前后
    // L2 sway 左右
    // R0 twist 旋转 Yaw 偏航角
    // R1 roll 左右摆动 滚转角
    // R2 pitch 前后摆动 俯仰角
    // iPhone
    // this.ayva.move(
    //         {axis: "sway", to: normalize(-data.x, "x"), speed: 100},
    //         {axis: "stroke", to: normalize(data.y, "y"), speed: 100},
    //         {axis: "surge", to: normalize(-data.z, "z"), speed: 100},
    //         {axis: "pitch", to: normalize(data.pitch, "pitch"), speed: 100},
    //         {axis: "twist", to: normalize(data.yaw, "yaw"), speed: 100},
    //         {axis: "roll", to: normalize(-data.roll, "roll"), speed: 100}
    // )
    // SteamVR
    // this.ayva.move(
    //         {axis: "sway", to: normalize(-data.x, "x"), speed: 100},
    //         {axis: "stroke", to: normalize(data.y, "y"), speed: 100},
    //         {axis: "surge", to: normalize(-data.z, "z"), speed: 100},
    //         {axis: "pitch", to: normalize(-data.pitch, "pitch"), speed: 100},
    //         {axis: "twist", to: normalize(data.yaw, "yaw"), speed: 100},
    //         {axis: "roll", to: normalize(-data.roll, "roll"), speed: 100}
    // )
    if (!this.started) {
      return;
    }
    // VRChat
    this.ayva.move(
      { axis: 'sway', to: normalize(data.x, 'x'), speed: 100 },
      { axis: 'stroke', to: normalize(data.y, 'y'), speed: 100 },
      { axis: 'surge', to: normalize(data.z, 'z'), speed: 100 },
      { axis: 'pitch', to: normalize(data.pitch, 'pitch'), speed: 100 },
      { axis: 'twist', to: normalize(data.yaw, 'yaw'), speed: 100 },
      { axis: 'roll', to: normalize(data.roll, 'roll'), speed: 100 }
    );
  }

  handlereset () {
    if (this.reset) {
      if (this.max_x === this.min_x || this.max_y === this.min_y || this.max_z === this.min_z) {
        alert('校准异常');
        this.max_x = -999;
        this.min_x = 999;
        this.max_y = -999;
        this.min_y = 999;
        this.max_z = -999;
        this.min_z = 999;
        this.max_roll = -999;
        this.min_roll = 999;
        this.max_pitch = -999;
        this.min_pitch = 999;
        this.max_yaw = -999;
        this.min_yaw = 999;
      }
      this.reset = false;
      storage.save('minmax', {
        max_x: this.max_x,
        max_y: this.max_y,
        max_z: this.max_z,
        max_roll: this.max_roll,
        max_pitch: this.max_pitch,
        max_yaw: this.max_yaw,
        min_x: this.min_x,
        min_y: this.min_y,
        min_z: this.min_z,
        min_roll: this.min_roll,
        min_pitch: this.min_pitch,
        min_yaw: this.min_yaw,
      });
      console.log(`max_x ${this.max_x} max_y ${this.max_y} max_z ${this.max_z} min_x ${this.min_x} min_y ${this.min_y} min_z ${this.min_z}`);
      this.cstatus = '校准';
      return;
    }
    this.max_x = -999;
    this.min_x = 999;
    this.max_y = -999;
    this.min_y = 999;
    this.max_z = -999;
    this.min_z = 999;
    this.max_pitch = -999;
    this.min_pitch = 999;
    this.max_yaw = -999;
    this.min_yaw = 999;
    this.max_roll = -999;
    this.min_roll = 999;
    this.reset = true;
    this.cstatus = '校准中';
  }

  stop () {
    this.started = false;
  }

  startControl () {
    this.started = true;
  }
}

Object.assign(VRChatController.prototype, eventMixin);

export default VRChatController;
