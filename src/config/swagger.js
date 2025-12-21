/**
 * Swagger/OpenAPI Configuration
 * API Documentation using swagger-jsdoc and swagger-ui-express
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Campus Platform API',
      version: '1.0.0',
      description: 'Complete API documentation for Smart Campus Ecosystem Management Platform',
      contact: {
        name: 'Smart Campus Team',
        email: 'support@smartcampus.edu'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000/api/v1',
        description: 'API Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'ERROR_CODE'
                },
                message: {
                  type: 'string',
                  example: 'Error description'
                }
              }
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'student@smartcampus.edu'
            },
            role: {
              type: 'string',
              enum: ['student', 'faculty', 'admin', 'staff'],
              example: 'student'
            },
            is_verified: {
              type: 'boolean',
              example: true
            },
            profile_picture_url: {
              type: 'string',
              nullable: true,
              example: '/uploads/profiles/image.jpg'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        StudentProfile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            student_number: {
              type: 'string',
              example: '20240001'
            },
            department_id: {
              type: 'string',
              format: 'uuid'
            },
            gpa: {
              type: 'number',
              format: 'decimal',
              example: 3.50
            },
            cgpa: {
              type: 'number',
              format: 'decimal',
              example: 3.45
            }
          }
        },
        FacultyProfile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            employee_number: {
              type: 'string',
              example: 'FAC001'
            },
            title: {
              type: 'string',
              example: 'Prof. Dr.'
            },
            department_id: {
              type: 'string',
              format: 'uuid'
            }
          }
        },
        Tokens: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            },
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
          }
        },
        // Part 3 Schemas
        Wallet: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            balance: { type: 'number', example: 150.50 },
            currency: { type: 'string', example: 'TRY' },
            is_active: { type: 'boolean', example: true }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            wallet_id: { type: 'string', format: 'uuid' },
            amount: { type: 'number', example: 25.00 },
            type: {
              type: 'string',
              enum: ['deposit', 'withdrawal', 'meal_payment', 'event_payment', 'refund']
            },
            description: { type: 'string' },
            reference_id: { type: 'string', format: 'uuid' },
            reference_type: { type: 'string', example: 'meal_reservation' },
            status: { type: 'string', enum: ['pending', 'completed', 'failed'] },
            transaction_date: { type: 'string', format: 'date-time' }
          }
        },
        MealMenu: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            cafeteria_id: { type: 'string', format: 'uuid' },
            date: { type: 'string', format: 'date', example: '2024-01-15' },
            type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner'] },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Grilled Chicken' },
                  category: { type: 'string', example: 'main' }
                }
              }
            },
            price: { type: 'number', example: 25.00 },
            is_published: { type: 'boolean' },
            max_reservations: { type: 'integer' }
          }
        },
        MealReservation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            qr_code: { type: 'string', example: 'MEAL-ABC123XYZ' },
            status: { type: 'string', enum: ['reserved', 'consumed', 'cancelled', 'no_show'] },
            reservation_time: { type: 'string', format: 'date-time' },
            consumed_at: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'AI Workshop' },
            description: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            end_date: { type: 'string', format: 'date-time', nullable: true },
            location: { type: 'string', example: 'Conference Hall A' },
            category: { type: 'string' },
            capacity: { type: 'integer', example: 100 },
            registered_count: { type: 'integer', example: 45 },
            is_paid: { type: 'boolean' },
            price: { type: 'number', example: 50.00 },
            currency: { type: 'string', example: 'TRY' },
            image_url: { type: 'string', nullable: true }
          }
        },
        EventRegistration: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['registered', 'waitlisted', 'cancelled', 'attended'] },
            qr_code: { type: 'string', example: 'EVT-ABC123XYZ' },
            checked_in: { type: 'boolean' },
            check_in_time: { type: 'string', format: 'date-time', nullable: true },
            payment_status: { type: 'string', enum: ['not_required', 'pending', 'completed', 'refunded'] }
          }
        },
        Schedule: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            section_id: { type: 'string', format: 'uuid' },
            classroom_id: { type: 'string', format: 'uuid' },
            day_of_week: { type: 'string', enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
            start_time: { type: 'string', format: 'time', example: '09:00' },
            end_time: { type: 'string', format: 'time', example: '09:50' }
          }
        },
        ClassroomReservation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            classroom_id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'Study Group Meeting' },
            purpose: { type: 'string', enum: ['class', 'meeting', 'event', 'study', 'exam', 'other'] },
            date: { type: 'string', format: 'date' },
            start_time: { type: 'string', format: 'time' },
            end_time: { type: 'string', format: 'time' },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'cancelled'] }
          }
        },
        ScheduleGenerationResult: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            statistics: {
              type: 'object',
              properties: {
                total_sections: { type: 'integer' },
                scheduled_sections: { type: 'integer' },
                unscheduled_sections: { type: 'integer' },
                backtrack_count: { type: 'integer' },
                duration_ms: { type: 'integer' }
              }
            },
            assignments: { type: 'array', items: { type: 'object' } },
            unassigned: { type: 'array', items: { type: 'object' } }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'INVALID_TOKEN',
                  message: 'Invalid token'
                }
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: 'You are not authorized to access this resource'
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Email is required, Password must be at least 8 characters'
                }
              }
            }
          }
        },
        InsufficientBalance: {
          description: 'Wallet balance is insufficient',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient wallet balance' }
              }
            }
          }
        },
        ConflictError: {
          description: 'Resource conflict (e.g., schedule or reservation overlap)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: { code: 'SCHEDULE_CONFLICT', message: 'Classroom is already booked at this time' }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Users',
        description: 'User profile and management endpoints'
      },
      {
        name: 'Courses',
        description: 'Course browsing and listing endpoints'
      },
      {
        name: 'Enrollments',
        description: 'Course enrollment management endpoints'
      },
      {
        name: 'Grades',
        description: 'Grade management and transcript endpoints'
      },
      {
        name: 'Attendance',
        description: 'GPS-based attendance management endpoints'
      },
      {
        name: 'Sections',
        description: 'Course section management endpoints'
      },
      {
        name: 'Health',
        description: 'System health check endpoints'
      },
      {
        name: 'Departments',
        description: 'Academic department endpoints'
      },
      // Part 3 Tags
      {
        name: 'Wallet',
        description: 'Wallet management and payment operations'
      },
      {
        name: 'Meals',
        description: 'Meal reservation and menu management'
      },
      {
        name: 'Events',
        description: 'Event management and registration'
      },
      {
        name: 'Scheduling',
        description: 'Automatic course scheduling using CSP algorithm'
      },
      {
        name: 'Reservations',
        description: 'Classroom reservation management'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
