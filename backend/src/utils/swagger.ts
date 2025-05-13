import { Express } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

/**
 * Setup Swagger documentation for the API
 * @param app Express application
 */
export const setupSwagger = (app: Express): void => {
  // Swagger definition
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Ryzer Wallet API',
        version: '1.0.0',
        description: 'API documentation for Ryzer Wallet backend services',
        contact: {
          name: 'Ryzer Wallet Team',
          url: 'https://ryzerwallet.com',
          email: 'support@ryzerwallet.com',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT || 3000}`,
          description: 'Development server',
        },
        {
          url: 'https://api.ryzerwallet.com',
          description: 'Production server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
    apis: ['./src/api/**/*.ts', './src/models/**/*.ts'],
  };

  // Initialize swagger-jsdoc
  const swaggerSpec = swaggerJsdoc(swaggerOptions);

  // Serve swagger docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Serve swagger spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};
