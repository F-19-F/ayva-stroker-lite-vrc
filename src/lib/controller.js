import {
  Ayva, GeneratorBehavior, TempestStroke, VariableDuration
} from 'ayvajs';
import CustomBehaviorStorage from './custom-behavior-storage';

import { clamp, createConstantProperty } from './util.js';

const STATE = {
  TRANSITION_MANUAL: 0,
  TRANSITION_FREE_PLAY: 1,
  STROKING: 2,
};

export default class Controller extends GeneratorBehavior {
  #customBehaviorStorage = new CustomBehaviorStorage();

  #currentStroke = null;

  #manualStroke = null;

  #freePlay = false;

  #duration = null;

  #bpm;

  constructor () {
    super();

    createConstantProperty(this, 'bpmSliderState', {
      active: false,
      updated: false,
      value: null,
    });
  }

  * generate (ayva) {
    switch (this.#computeState()) {
      case STATE.TRANSITION_MANUAL:
        yield* this.#createTransition(ayva, this.#manualStroke);
        this.#resetManualMode();

        break;
      case STATE.TRANSITION_FREE_PLAY:
        yield* this.#createTransition(ayva, this.#freePlayStroke());

        break;
      case STATE.STROKING:
        yield* this.#currentStroke;

        break;
      default:
        // Waiting for a command.
        yield 0.1;
    }
  }

  startManualMode (stroke) {
    this.#manualStroke = stroke;
  }

  startFreePlayMode () {
    this.#freePlay = true;
  }

  resetTimer () {
    if (this.#freePlay) {
      const [from, to] = this.parameters['pattern-duration'];

      if (from === to) {
        this.#duration = new VariableDuration(from);
      } else {
        this.#duration = new VariableDuration(from, to);
      }
    }
  }

  #computeState () {
    if (this.#manualStroke) {
      return STATE.TRANSITION_MANUAL;
    }

    if (this.#freePlay && this.#readyForNextStroke()) {
      return STATE.TRANSITION_FREE_PLAY;
    }

    if (this.#currentStroke) {
      return STATE.STROKING;
    }

    return null;
  }

  #resetManualMode () {
    this.#manualStroke = null;
    this.#duration = null;
    this.#freePlay = false;
  }

  * #createTransition (ayva, strokeConfig) {
    this.#bpm = this.#generateNextBpm();
    const bpmProvider = this.#createBpmProvider();

    if (this.#currentStroke) {
      // Create smooth transition to the next stroke.
      const duration = this.#generateTransitionDuration();
      this.#currentStroke = this.#currentStroke
        .transition(this.#createStrokeConfig(strokeConfig), bpmProvider, duration, this.#startTransition.bind(this), (_, bpm) => {
          // Make sure we use the pretransformed stroke config for the event.
          this.#endTransition(strokeConfig, bpm);
        });

      yield* this.#currentStroke;
    } else {
      // Just move to the start position for the new stroke.
      this.#currentStroke = new TempestStroke(this.#createStrokeConfig(strokeConfig), bpmProvider).bind(ayva);

      this.#startTransition(1, this.#currentStroke.bpm);
      yield* this.#currentStroke.start({ duration: 1, value: Ayva.RAMP_PARABOLIC });
      this.#endTransition(strokeConfig, this.#currentStroke.bpm);
    }
  }

  #startTransition (duration, bpm) {
    if (this.onTransitionStart) {
      this.onTransitionStart(duration, bpm);
    }
  }

  #endTransition (strokeConfig, bpm) {
    if (this.onTransitionEnd) {
      this.onTransitionEnd(strokeConfig, bpm);
    }

    // Start the timer for the next stroke after finishing the transition.
    this.resetTimer();
  }

  #createStrokeConfig (stroke) {
    if (typeof stroke === 'string') {
      // TODO: Support script here.
      const customBehaviorLibrary = this.#customBehaviorStorage.load();
      const config = customBehaviorLibrary[stroke]?.data || TempestStroke.library[stroke];

      const existingTwist = config.twist || config.R0;
      const noTwist = !existingTwist || (existingTwist.from === 0.5 && existingTwist.to === 0.5);

      if (this.parameters.twist && noTwist) {
        const [from, to] = this.parameters['twist-range'];
        const phase = this.parameters['twist-phase'];
        const ecc = this.parameters['twist-ecc'];

        config.R0 = {
          from, to, phase, ecc,
        };
      }

      return config;
    }

    return stroke;
  }

  #readyForNextStroke () {
    // We're ready for the next stroke when the duration has elapsed, we have strokes available,
    // and also the user is not mucking about with the bpm slider.
    return (!this.#duration || this.#duration.complete) && this.strokes.length && !this.bpmSliderState.active;
  }

  #generateTransitionDuration () {
    const [from, to] = this.parameters['transition-duration'];
    return Ayva.map(Math.random(), 0, 1, from, to);
  }

  #generateNextBpm () {
    const [from, to] = this.parameters.bpm;
    return Math.floor(Ayva.map(Math.random(), 0, 1, from, to));
  }

  #generateNextContinuousBpm (startBpm) {
    const [minBpm, maxBpm] = this.parameters.bpm;
    const [minAcc, maxAcc] = this.parameters.acceleration;
    const delta = Ayva.map(Math.random(), 0, 1, minAcc, maxAcc);
    return clamp(startBpm + (Math.random() < 0.5 ? delta : -delta), minBpm, maxBpm);
  }

  #createBpmProvider () {
    const bpmProvider = () => {
      if (!this.#freePlay || this.bpmSliderState.active || this.bpmSliderState.updated) {
        // Use user supplied bpm from slider.
        this.#bpm = this.bpmSliderState.value;
        this.bpmSliderState.updated = false;
      }

      if (this.parameters['bpm-mode'] === 'continuous') {
        if (!this.bpmSliderState.active && bpmProvider.initialized) {
          const {
            startBpm, endBpm, startTime, endTime,
          } = bpmProvider;

          const time = performance.now();

          if (time >= endTime) {
            this.#bpm = endBpm;
            bpmProvider.startTime = performance.now();
            bpmProvider.endTime = bpmProvider.startTime + 1000;
            bpmProvider.startBpm = endBpm;
            bpmProvider.endBpm = this.#generateNextContinuousBpm(endBpm);
          } else {
            this.#bpm = Ayva.map(time, startTime, endTime, startBpm, endBpm);
          }

          if (this.onUpdateBpm) {
            this.onUpdateBpm(this.#bpm);
          }
        } else {
          bpmProvider.startTime = 0;
          bpmProvider.endTime = 0;
          bpmProvider.startBpm = this.#bpm;
          bpmProvider.endBpm = this.#bpm;
          bpmProvider.initialized = true;
        }
      }

      return this.#bpm;
    };

    return bpmProvider;
  }

  #freePlayStroke () {
    return this.strokes[Math.floor(Math.random() * this.strokes.length)];
  }
}
