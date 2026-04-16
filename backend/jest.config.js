import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.test') });

export default {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/__tests__/setupEnv.js'],
  transform: {
    '^.+\\.js$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] }]
  },
  testMatch: ['src/__tests__/**/*.test.js', '**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/index.js',
    '!src/jobs/**/*.js',
    '!src/socket/**/*.js',
    // External service wrappers require real credentials — excluded from threshold
    '!src/services/fcm.js',
    '!src/services/msg91.js',
    '!src/services/olaMaps.js',
    '!src/services/redis.js',
    '!src/services/r2.js',
    '!src/scripts/**/*.js',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testTimeout: 10000,
  verbose: true,
};
