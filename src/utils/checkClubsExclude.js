const { Club, User } = require('../models');

async function checkClubsWithIncludes() {
    try {
        console.log('Testing Club.findAll with includes...');
        const clubs = await Club.findAll({
            include: [
                {
                    model: User,
                    as: 'president',
                    attributes: ['id', 'email', 'first_name', 'last_name']
                },
                {
                    model: User,
                    as: 'advisor',
                    attributes: ['id', 'email', 'first_name', 'last_name']
                }
            ],
            limit: 1
        });
        console.log('✅ Success! Found ' + clubs.length + ' clubs.');
    } catch (error) {
        console.error('❌ Error checking clubs with includes:', error.message);
        console.error(error); // Print full error
    } finally {
        process.exit();
    }
}

checkClubsWithIncludes();
