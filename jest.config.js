module.exports = {
    testEnvironment: 'node',
    verbose: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/config/*.js',
        '!src/models/index.js',
        '!src/server.js'
    ],
    testPathIgnorePatterns: ['/node_modules/'],
    // Setup file for database connection mocking/handling could go here
};
