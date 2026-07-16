import { GameState } from '../types';
import { encodeState, ENCODING_SIZE } from './encoder';
import { ValueFunction } from './types';

// ---- Types ----

export interface LayerWeights {
  w: number[];   // flat row-major: inSize × outSize
  b: number[];   // outSize
  inSize: number;
  outSize: number;
}

export interface MLPWeights {
  layers: LayerWeights[];
  layerSizes: number[];
}

// Per-layer Adam moment accumulators
export interface AdamState {
  t: number;
  layers: { mw: number[]; vw: number[]; mb: number[]; vb: number[] }[];
}

// 288 → 256 → 128 → 64 → 1
export const LAYER_SIZES = [ENCODING_SIZE, 256, 128, 64, 1] as const;

// ---- Initialization ----

function randNormal(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
}

export function createWeights(): MLPWeights {
  const sizes = LAYER_SIZES as unknown as number[];
  const layers: LayerWeights[] = [];
  for (let l = 0; l < sizes.length - 1; l++) {
    const inSize = sizes[l];
    const outSize = sizes[l + 1];
    // Xavier/Glorot initialization
    const scale = Math.sqrt(2.0 / (inSize + outSize));
    layers.push({
      w: Array.from({ length: inSize * outSize }, () => randNormal() * scale),
      b: new Array(outSize).fill(0),
      inSize,
      outSize,
    });
  }
  return { layers, layerSizes: [...sizes] };
}

export function createAdamState(weights: MLPWeights): AdamState {
  return {
    t: 0,
    layers: weights.layers.map(({ w, b }) => ({
      mw: new Array(w.length).fill(0),
      vw: new Array(w.length).fill(0),
      mb: new Array(b.length).fill(0),
      vb: new Array(b.length).fill(0),
    })),
  };
}

// ---- Forward pass ----

export interface ForwardResult {
  output: number;
  // activations[0] = input; activations[l+1] = post-ReLU output of layer l
  activations: number[][];
  // preActivations[l] = Wx+b before activation for layer l
  preActivations: number[][];
}

export function forward(weights: MLPWeights, input: Float32Array): ForwardResult {
  const activations: number[][] = [Array.from(input)];
  const preActivations: number[][] = [];

  for (let l = 0; l < weights.layers.length; l++) {
    const { w, b, inSize, outSize } = weights.layers[l];
    const x = activations[l];
    const pre = new Array<number>(outSize);
    for (let j = 0; j < outSize; j++) {
      let sum = b[j];
      for (let i = 0; i < inSize; i++) {
        sum += x[i] * w[i * outSize + j];
      }
      pre[j] = sum;
    }
    preActivations.push(pre);
    // ReLU on hidden layers; linear output on last layer
    const isLast = l === weights.layers.length - 1;
    activations.push(isLast ? [...pre] : pre.map((v) => Math.max(0, v)));
  }

  return { output: activations[activations.length - 1][0], activations, preActivations };
}

// ---- Backward pass (MSE loss) ----

export interface Gradients {
  layers: { gw: number[]; gb: number[] }[];
}

export function backward(
  weights: MLPWeights,
  { activations, preActivations }: ForwardResult,
  target: number,
): Gradients {
  const output = activations[activations.length - 1][0];
  const grads: Gradients = {
    layers: weights.layers.map(({ w, b }) => ({
      gw: new Array(w.length).fill(0),
      gb: new Array(b.length).fill(0),
    })),
  };

  // dL/d_output for MSE: 2*(output - target)
  let delta: number[] = [2 * (output - target)];

  for (let l = weights.layers.length - 1; l >= 0; l--) {
    const { w, inSize, outSize } = weights.layers[l];
    const x = activations[l];
    const { gw, gb } = grads.layers[l];

    for (let j = 0; j < outSize; j++) {
      gb[j] = delta[j];
      for (let i = 0; i < inSize; i++) {
        gw[i * outSize + j] = x[i] * delta[j];
      }
    }

    if (l > 0) {
      const prevPre = preActivations[l - 1];
      const prevDelta = new Array<number>(inSize).fill(0);
      for (let i = 0; i < inSize; i++) {
        let sum = 0;
        for (let j = 0; j < outSize; j++) {
          sum += w[i * outSize + j] * delta[j];
        }
        prevDelta[i] = sum * (prevPre[i] > 0 ? 1 : 0); // ReLU backward
      }
      delta = prevDelta;
    }
  }

  return grads;
}

// ---- Adam optimizer ----

const B1 = 0.9;
const B2 = 0.999;
const EPS = 1e-8;

export function adamUpdate(
  weights: MLPWeights,
  grads: Gradients,
  adam: AdamState,
  lr: number,
): void {
  adam.t += 1;
  const bc1 = 1 - B1 ** adam.t;
  const bc2 = 1 - B2 ** adam.t;

  for (let l = 0; l < weights.layers.length; l++) {
    const { w, b } = weights.layers[l];
    const { gw, gb } = grads.layers[l];
    const { mw, vw, mb, vb } = adam.layers[l];

    for (let k = 0; k < w.length; k++) {
      mw[k] = B1 * mw[k] + (1 - B1) * gw[k];
      vw[k] = B2 * vw[k] + (1 - B2) * gw[k] ** 2;
      w[k] -= (lr * (mw[k] / bc1)) / (Math.sqrt(vw[k] / bc2) + EPS);
    }
    for (let k = 0; k < b.length; k++) {
      mb[k] = B1 * mb[k] + (1 - B1) * gb[k];
      vb[k] = B2 * vb[k] + (1 - B2) * gb[k] ** 2;
      b[k] -= (lr * (mb[k] / bc1)) / (Math.sqrt(vb[k] / bc2) + EPS);
    }
  }
}

// ---- Serialization ----

export function serializeWeights(weights: MLPWeights): string {
  return JSON.stringify(weights);
}

export function deserializeWeights(json: string): MLPWeights {
  return JSON.parse(json) as MLPWeights;
}

// ---- Production value function ----

// Drop-in replacement for ruleBasedValueFunction once weights are trained.
// Load weights from disk (scripts/weights.json) and pass them here.
export function learnedValueFunction(weights: MLPWeights): ValueFunction {
  return (state: GameState, playerIndex: number): number => {
    const vec = encodeState(state, playerIndex);
    return forward(weights, vec).output;
  };
}
