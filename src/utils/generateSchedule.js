
const SchedulingService = require('../services/schedulingService');
const { sequelize } = require('../models');

async function generateSchedule() {
    try {
        console.log('🔄 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Database connection established.');

        console.log('📅 Generating schedule for Spring 2024...');
        const result = await SchedulingService.generateSchedule('Spring', 2024);

        console.log('==========================================');
        console.log(`✅ Schedule Generation ${result.success ? 'Successful' : 'Completed (Partial)'}`);
        console.log(`📊 Statistics:`);
        console.log(`   - Total Sections: ${result.statistics.total_sections}`);
        console.log(`   - Scheduled: ${result.statistics.scheduled_sections}`);
        console.log(`   - Unassigned: ${result.statistics.unscheduled_sections}`);
        console.log(`   - Backtracks: ${result.statistics.backtrack_count}`);
        console.log(`   - Duration: ${result.statistics.duration_ms}ms`);
        console.log('==========================================');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error generating schedule:', error);
        process.exit(1);
    }
}

generateSchedule();
