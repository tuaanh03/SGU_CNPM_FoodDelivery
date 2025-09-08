module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.js$': 'babel-jest'
    },
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    collectCoverageFrom: [
        'services/**/*.js',
        'api-gateway/**/*.js',
        '!**/node_modules/**',
        '!**/coverage/**',
        '!**/dist/**',
        '!**/__tests__/**',
        '!**/database/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    testMatch: [
        '**/services/**/__tests__/**/*.test.js',
        '**/api-gateway/**/__tests__/**/*.test.js',
        '**/contract-tests/**/*.test.js'
    ],
    setupFilesAfterEnv: ['<rootDir>/test-setup.js'],
    coverageThreshold: {
        global: {
            branches: 60,
            functions: 60,
            lines: 60,
            statements: 60
        }
    }
};