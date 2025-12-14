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
        url: 'http://localhost:3000/api/v1',
        description: 'Development server'
      },
      {
        url: 'http://localhost:3000',
        description: 'Base URL'
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
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
