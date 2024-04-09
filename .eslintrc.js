module.exports = {
  'extends': 'google',
  'parserOptions': {
    'ecmaVersion': 2017,
    'sourceType': 'module',
  },
  'env': {
    'browser': true,
    'es6': true,
    'node': true,
    'jest': true
  },
  'rules': {
    'max-len': 'off',
    'require-jsdoc': 'off',
    'arrow-parens': 'off',
    'comma-dangle': 'off',
    'no-throw-literal': 'off',
    'camelcase': 'off',
    'prefer-rest-params': 'off',
    'no-invalid-this': 'off',
    'eol-last': 'off',
    'no-undef': 2,
  },
  "globals": {
    "adapter": true,
    "browserSupportsIPHandlingPolicy": true,
    "browserSupportsNonProxiedUdpBoolean": true,
    "chrome": true,
    "ga": true,
    "getPolicyFromBooleans": true,
    "importScripts": true,
    // From WebGPU specification
    "GPUBufferUsage": true,
    "GPUTextureUsage": true,
    // From Streams specification
    "TransformStream": true,
    // From WebCodec specification
    "AudioData": true,
    "AudioEncoder": true,
    "AudioDecoder": true,
    "VideoFrame": true,
    "VideoEncoder": true,
    "VideoDecoder": true,
  },
  "plugins": ["jest"]
};
