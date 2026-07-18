import swaggerJsdoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kryon API',
      version: '1.0.0',
      description: 'REST API інтернет-магазину Kryon (Node.js + Express + PostgreSQL).',
    },
    servers: [{ url: 'http://localhost:4000', description: 'Local' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    tags: [
      { name: 'Auth' },
      { name: 'Products' },
      { name: 'Categories' },
      { name: 'Cart' },
      { name: 'Orders' },
      { name: 'Admin' },
      { name: 'CRM' },
      { name: 'Wishlist' },
      { name: 'Reviews' },
    ],
  },
  apis: ['src/modules/**/*.routes.ts', 'dist/modules/**/*.routes.js'],
});
