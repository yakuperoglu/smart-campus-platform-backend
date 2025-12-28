/**
 * Seed Events
 * 
 * Creates diverse, unique events for each category with different icons
 * Updated: Event seeding functionality with 29 unique events
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
} catch (e) {
  // dotenv optional
}
const { Event, User } = require('../models');
const sequelize = require('../config/database');

// Icon URLs - Using emoji-based placeholder images for variety
const ICONS = {
  conference: [
    'https://api.dicebear.com/7.x/shapes/svg?seed=conference1&backgroundColor=b6e3f4',
    'https://api.dicebear.com/7.x/shapes/svg?seed=conference2&backgroundColor=c7d2fe',
    'https://api.dicebear.com/7.x/shapes/svg?seed=conference3&backgroundColor=ffd5dc',
    'https://api.dicebear.com/7.x/shapes/svg?seed=conference4&backgroundColor=ffdfbf'
  ],
  workshop: [
    'https://api.dicebear.com/7.x/shapes/svg?seed=workshop1&backgroundColor=ffd93d',
    'https://api.dicebear.com/7.x/shapes/svg?seed=workshop2&backgroundColor=6bcf7f',
    'https://api.dicebear.com/7.x/shapes/svg?seed=workshop3&backgroundColor=4d96ff',
    'https://api.dicebear.com/7.x/shapes/svg?seed=workshop4&backgroundColor=c44569',
    'https://api.dicebear.com/7.x/shapes/svg?seed=workshop5&backgroundColor=f8b500'
  ],
  seminar: [
    'https://api.dicebear.com/7.x/shapes/svg?seed=seminar1&backgroundColor=00d2ff',
    'https://api.dicebear.com/7.x/shapes/svg?seed=seminar2&backgroundColor=3a7bd5',
    'https://api.dicebear.com/7.x/shapes/svg?seed=seminar3&backgroundColor=00f260',
    'https://api.dicebear.com/7.x/shapes/svg?seed=seminar4&backgroundColor=0575e6'
  ],
  sports: [
    'https://api.dicebear.com/7.x/shapes/svg?seed=sports1&backgroundColor=ff6b6b',
    'https://api.dicebear.com/7.x/shapes/svg?seed=sports2&backgroundColor=4ecdc4',
    'https://api.dicebear.com/7.x/shapes/svg?seed=sports3&backgroundColor=ffe66d',
    'https://api.dicebear.com/7.x/shapes/svg?seed=sports4&backgroundColor=95e1d3',
    'https://api.dicebear.com/7.x/shapes/svg?seed=sports5&backgroundColor=f38181',
    'https://api.dicebear.com/7.x/shapes/svg?seed=sports6&backgroundColor=aa96da'
  ],
  social: [
    'https://api.dicebear.com/7.x/shapes/svg?seed=social1&backgroundColor=ff9a9e',
    'https://api.dicebear.com/7.x/shapes/svg?seed=social2&backgroundColor=fecfef',
    'https://api.dicebear.com/7.x/shapes/svg?seed=social3&backgroundColor=fecfef',
    'https://api.dicebear.com/7.x/shapes/svg?seed=social4&backgroundColor=ffecd2',
    'https://api.dicebear.com/7.x/shapes/svg?seed=social5&backgroundColor=fcb69f'
  ],
  cultural: [
    'https://api.dicebear.com/7.x/shapes/svg?seed=cultural1&backgroundColor=667eea',
    'https://api.dicebear.com/7.x/shapes/svg?seed=cultural2&backgroundColor=764ba2',
    'https://api.dicebear.com/7.x/shapes/svg?seed=cultural3&backgroundColor=f093fb',
    'https://api.dicebear.com/7.x/shapes/svg?seed=cultural4&backgroundColor=f5576c',
    'https://api.dicebear.com/7.x/shapes/svg?seed=cultural5&backgroundColor=4facfe'
  ]
};

// Event data for each category
const EVENTS_DATA = {
  conference: [
    {
      title: 'Tech Innovation Summit 2024',
      description: 'Join us for a groundbreaking conference featuring industry leaders discussing the future of technology, AI, and digital transformation. Network with professionals and explore cutting-edge innovations.',
      location: 'Grand Conference Hall',
      capacity: 300,
      is_paid: true,
      price: 150.00,
      iconIndex: 0
    },
    {
      title: 'Global Business Leadership Forum',
      description: 'An exclusive conference bringing together CEOs, entrepreneurs, and business strategists to share insights on leadership, market trends, and sustainable business practices.',
      location: 'Business School Auditorium',
      capacity: 250,
      is_paid: true,
      price: 200.00,
      iconIndex: 1
    },
    {
      title: 'Future of Education Conference',
      description: 'Explore innovative teaching methods, educational technology, and the evolution of learning. Featuring keynote speakers from leading universities and EdTech companies.',
      location: 'Education Building Main Hall',
      capacity: 400,
      is_paid: false,
      price: 0,
      iconIndex: 2
    },
    {
      title: 'Climate Action & Sustainability Summit',
      description: 'A critical discussion on climate change, renewable energy, and sustainable practices. Featuring environmental experts, policymakers, and green technology innovators.',
      location: 'Environmental Science Center',
      capacity: 350,
      is_paid: true,
      price: 100.00,
      iconIndex: 3
    }
  ],
  workshop: [
    {
      title: 'Web Development Bootcamp: Full Stack Mastery',
      description: 'Intensive hands-on workshop covering React, Node.js, databases, and deployment. Build a complete web application from scratch. Perfect for beginners and intermediate developers.',
      location: 'Computer Lab A',
      capacity: 30,
      is_paid: true,
      price: 75.00,
      iconIndex: 0
    },
    {
      title: 'Digital Marketing & Social Media Strategy',
      description: 'Learn to create compelling content, grow your audience, and master social media analytics. Includes practical exercises and real-world case studies.',
      location: 'Marketing Department Room 201',
      capacity: 40,
      is_paid: true,
      price: 60.00,
      iconIndex: 1
    },
    {
      title: 'Data Science with Python Workshop',
      description: 'Hands-on introduction to data analysis, visualization, and machine learning using Python. Bring your laptop and dive into real datasets.',
      location: 'Data Science Lab',
      capacity: 25,
      is_paid: true,
      price: 85.00,
      iconIndex: 2
    },
    {
      title: 'Creative Writing & Storytelling Masterclass',
      description: 'Unlock your creative potential with expert guidance on narrative structure, character development, and writing techniques. Includes writing exercises and peer feedback.',
      location: 'Literature Department',
      capacity: 35,
      is_paid: false,
      price: 0,
      iconIndex: 3
    },
    {
      title: 'UI/UX Design Fundamentals Workshop',
      description: 'Learn design thinking, user research, wireframing, and prototyping. Create beautiful, user-friendly interfaces. No prior design experience required.',
      location: 'Design Studio',
      capacity: 28,
      is_paid: true,
      price: 70.00,
      iconIndex: 4
    }
  ],
  seminar: [
    {
      title: 'Entrepreneurship & Startup Success Stories',
      description: 'Hear from successful entrepreneurs who built their companies from the ground up. Learn about funding, scaling, and overcoming challenges in the startup world.',
      location: 'Business Innovation Center',
      capacity: 150,
      is_paid: false,
      price: 0,
      iconIndex: 0
    },
    {
      title: 'Mental Health & Wellbeing in Academia',
      description: 'An important discussion on managing stress, maintaining work-life balance, and supporting mental health in academic and professional environments.',
      location: 'Student Wellness Center',
      capacity: 200,
      is_paid: false,
      price: 0,
      iconIndex: 1
    },
    {
      title: 'Career Development & Networking Strategies',
      description: 'Expert advice on building your professional network, crafting your personal brand, and navigating career transitions. Includes networking session.',
      location: 'Career Services Office',
      capacity: 120,
      is_paid: false,
      price: 0,
      iconIndex: 2
    },
    {
      title: 'Research Methods & Academic Writing',
      description: 'Master the art of academic research, literature review, and scholarly writing. Essential for graduate students and researchers.',
      location: 'Graduate Studies Building',
      capacity: 80,
      is_paid: false,
      price: 0,
      iconIndex: 3
    }
  ],
  sports: [
    {
      title: 'Inter-University Basketball Championship',
      description: 'Watch the most exciting basketball tournament of the year! Teams from across the region compete for the championship title. Food and drinks available.',
      location: 'Sports Complex Main Court',
      capacity: 500,
      is_paid: true,
      price: 25.00,
      iconIndex: 0
    },
    {
      title: 'Marathon & Fun Run 2024',
      description: 'Join hundreds of runners for our annual marathon! Choose from 5K, 10K, or full marathon. All participants receive a t-shirt and medal. Proceeds support local charities.',
      location: 'Campus Track & Field',
      capacity: 1000,
      is_paid: true,
      price: 30.00,
      iconIndex: 1
    },
    {
      title: 'Soccer Tournament Finals',
      description: 'The championship match of our campus soccer league! Two top teams battle for glory. Live commentary, halftime entertainment, and prize ceremony.',
      location: 'Soccer Field',
      capacity: 800,
      is_paid: false,
      price: 0,
      iconIndex: 2
    },
    {
      title: 'Yoga & Mindfulness Retreat',
      description: 'A peaceful day of yoga sessions, meditation, and wellness activities. Suitable for all levels. Includes healthy lunch and wellness goodie bag.',
      location: 'Recreation Center',
      capacity: 50,
      is_paid: true,
      price: 40.00,
      iconIndex: 3
    },
    {
      title: 'Swimming Competition',
      description: 'Competitive swimming event featuring freestyle, breaststroke, backstroke, and butterfly races. Open to all skill levels. Spectators welcome!',
      location: 'Olympic Swimming Pool',
      capacity: 300,
      is_paid: true,
      price: 20.00,
      iconIndex: 4
    },
    {
      title: 'Rock Climbing Challenge',
      description: 'Test your strength and agility at our indoor rock climbing competition. All safety equipment provided. Beginners welcome with introductory session.',
      location: 'Adventure Sports Center',
      capacity: 40,
      is_paid: true,
      price: 35.00,
      iconIndex: 5
    }
  ],
  social: [
    {
      title: 'Spring Festival & Food Fair',
      description: 'Celebrate spring with live music, delicious food from local vendors, games, and activities for all ages. Bring your friends and family!',
      location: 'Main Quad',
      capacity: 2000,
      is_paid: false,
      price: 0,
      iconIndex: 0
    },
    {
      title: 'Student Talent Show',
      description: 'Showcase your talents! Singing, dancing, comedy, magic - anything goes! Open mic and performances. Prizes for the top acts. Sign up to perform!',
      location: 'Performing Arts Center',
      capacity: 400,
      is_paid: false,
      price: 0,
      iconIndex: 1
    },
    {
      title: 'International Culture Night',
      description: 'Experience the rich diversity of our campus! Food, music, dance, and traditions from around the world. Cultural performances and interactive booths.',
      location: 'Student Union Building',
      capacity: 600,
      is_paid: false,
      price: 0,
      iconIndex: 2
    },
    {
      title: 'Graduation Gala & Awards Ceremony',
      description: 'A formal celebration honoring our graduating class. Dinner, awards, speeches, and dancing. Dress code: Semi-formal. Tickets required.',
      location: 'Grand Ballroom',
      capacity: 500,
      is_paid: true,
      price: 120.00,
      iconIndex: 3
    },
    {
      title: 'Game Night & Trivia Competition',
      description: 'Board games, video games, trivia, and fun competitions! Prizes for winners. Snacks and drinks provided. Perfect for making new friends!',
      location: 'Student Lounge',
      capacity: 100,
      is_paid: false,
      price: 0,
      iconIndex: 4
    }
  ],
  cultural: [
    {
      title: 'Classical Music Concert: Symphony Orchestra',
      description: 'An evening of beautiful classical music featuring our university symphony orchestra. Program includes works by Mozart, Beethoven, and contemporary composers.',
      location: 'Concert Hall',
      capacity: 600,
      is_paid: true,
      price: 50.00,
      iconIndex: 0
    },
    {
      title: 'Theater Production: "The Tempest"',
      description: 'Shakespeare\'s magical masterpiece brought to life by our drama department. Stunning sets, costumes, and performances. Limited run!',
      location: 'Theater Building',
      capacity: 300,
      is_paid: true,
      price: 35.00,
      iconIndex: 1
    },
    {
      title: 'Art Exhibition: Contemporary Perspectives',
      description: 'Opening night of our annual art exhibition featuring works by students, faculty, and guest artists. Wine and cheese reception included.',
      location: 'Art Gallery',
      capacity: 200,
      is_paid: false,
      price: 0,
      iconIndex: 2
    },
    {
      title: 'Poetry Reading & Open Mic Night',
      description: 'Share your poetry or enjoy listening to others. Featured guest poets and open mic sessions. Cozy atmosphere with coffee and pastries.',
      location: 'Café & Bookstore',
      capacity: 80,
      is_paid: false,
      price: 0,
      iconIndex: 3
    },
    {
      title: 'Film Screening: International Cinema',
      description: 'Screening of award-winning international films followed by discussion. This month: Films from Latin America. Subtitles provided.',
      location: 'Cinema Hall',
      capacity: 250,
      is_paid: true,
      price: 15.00,
      iconIndex: 4
    }
  ]
};

/**
 * Generate future dates for events
 */
function getFutureDate(daysFromNow, hour = 14, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function getEndDate(startDate, hours = 2) {
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + hours);
  return endDate;
}

/**
 * Seed events for all categories
 */
async function seedEvents() {
  try {
    console.log('🎉 Starting event seeding...');

    // Get an admin user to set as organizer (or use null)
    const adminUser = await User.findOne({
      where: { role: 'admin' },
      attributes: ['id']
    });

    const organizerId = adminUser ? adminUser.id : null;

    let totalCreated = 0;

    // Seed events for each category
    for (const [category, events] of Object.entries(EVENTS_DATA)) {
      console.log(`\n📅 Creating ${category} events...`);

      for (let i = 0; i < events.length; i++) {
        const eventData = events[i];
        const daysFromNow = 7 + (i * 5) + Math.floor(Math.random() * 3); // Spread events over weeks
        const startDate = getFutureDate(daysFromNow, 10 + Math.floor(Math.random() * 8), 0);
        const endDate = getEndDate(startDate, 2 + Math.floor(Math.random() * 3));

        const iconUrl = ICONS[category][eventData.iconIndex] || ICONS[category][0];

        const event = await Event.create({
          title: eventData.title,
          description: eventData.description,
          date: startDate,
          end_date: endDate,
          location: eventData.location,
          capacity: eventData.capacity,
          registered_count: 0,
          category: category,
          image_url: iconUrl,
          organizer_id: organizerId,
          is_active: true,
          requires_approval: false,
          is_paid: eventData.is_paid,
          price: eventData.price,
          currency: 'TRY'
        });

        console.log(`   ✓ Created: ${event.title}`);
        totalCreated++;
      }
    }

    console.log(`\n✅ Successfully created ${totalCreated} events!`);
    console.log(`   Categories: Conference (${EVENTS_DATA.conference.length}), Workshop (${EVENTS_DATA.workshop.length}), Seminar (${EVENTS_DATA.seminar.length}), Sports (${EVENTS_DATA.sports.length}), Social (${EVENTS_DATA.social.length}), Cultural (${EVENTS_DATA.cultural.length})`);

  } catch (error) {
    console.error('❌ Error seeding events:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  sequelize.authenticate()
    .then(() => {
      console.log('✅ Database connection established.');
      return seedEvents();
    })
    .then(() => {
      console.log('🎊 Event seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { seedEvents };

