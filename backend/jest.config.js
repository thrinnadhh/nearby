import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.test') });

export default {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/__tests__/setupEnv.js'],
  transform: {
    '^.+\\.js$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] }]
  },
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'   ],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.snippet.js',
    '!src/index.js',
    '!src/jobs/**/*.js',
    '!src/socket/**/*.js',
    '!src/services/fcm.js',
    '!src/services/msg91.js',
    '!src/services/tomTom.js',
    '!src/services/redis.js',
    '!src/services/r2.js',
    '!src/services/supabase.js',
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
  testTimeout: 30000,
  verbose: false,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
