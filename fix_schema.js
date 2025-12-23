
require('dotenv').config();
const {
    User,
    Student,
    Cafeteria,
    MealMenu,
    MealReservation,
    Event,
    EventRegistration,
    EventSurvey,
    SurveyResponse,
    Schedule,
    ClassroomReservation,
    Wallet,
    Transaction
} = require('./src/models');

const fixSchema = async () => {
    try {
        console.log('🔄 Syncing models with alter: true...');
        /*
        if (Student) await Student.sync({ alter: true });
        if (Cafeteria) await Cafeteria.sync({ alter: true });
        if (MealMenu) await MealMenu.sync({ alter: true });
        if (MealReservation) await MealReservation.sync({ alter: true });
        if (Event) await Event.sync({ alter: true });
        if (EventRegistration) await EventRegistration.sync({ alter: true });
        if (EventSurvey) await EventSurvey.sync({ alter: true });
        if (SurveyResponse) await SurveyResponse.sync({ alter: true });
        if (Schedule) await Schedule.sync({ alter: true });
        if (ClassroomReservation) await ClassroomReservation.sync({ alter: true });
        if (Wallet) await Wallet.sync({ alter: true });
        */
        if (User) await User.sync({ alter: true });
        if (Transaction) await Transaction.sync({ alter: true });

        console.log('✅ Models synced successfully.');
    } catch (error) {
        console.error('❌ Failed to sync models:', error);
    } finally {
        process.exit();
    }
};

fixSchema();
