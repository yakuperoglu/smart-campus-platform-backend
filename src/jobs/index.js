/**
 * Background Jobs Initializer
 */

const cron = require('node-cron');
const { checkAbsenceWarnings } = require('./attendanceJobs');

const initJobs = () => {
    console.log('Initializing background jobs...');

    // Schedule Absence Warning Job
    // Run every day at 23:00 (11 PM)
    cron.schedule('0 23 * * *', () => {
        checkAbsenceWarnings();
    });

    console.log('Background jobs scheduled.');
};

module.exports = initJobs;
