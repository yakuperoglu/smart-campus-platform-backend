
const { Schedule, CourseSection } = require('../models');

async function checkSchedule() {
    try {
        const count = await Schedule.count();
        console.log(`Total Schedule entries: ${count}`);

        const sections = await CourseSection.count();
        console.log(`Total Course Sections: ${sections}`);

        if (count === 0 && sections > 0) {
            console.log("WARNING: Schedules table is empty. CSP Scheduler must be run to populate it.");
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkSchedule();
