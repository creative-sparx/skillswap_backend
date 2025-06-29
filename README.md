# SkillSwap Backend API

## API Documentation

- Swagger (OpenAPI) starter: [`swagger.json`](./swagger.json)
- To view docs locally, use [Swagger Editor](https://editor.swagger.io/) and import `swagger.json`.
- To generate a Postman collection, import `swagger.json` into Postman.

## Email Notification Setup

- Configure `.env` with SendGrid or SMTP credentials:
  - `EMAIL_SERVICE=SendGrid`
  - `EMAIL_USER=apikey` (for SendGrid)
  - `EMAIL_PASS=your_sendgrid_api_key`
  - `EMAIL_FROM=SkillSwap <no-reply@skillswap.com>`

## Deployment Instructions

### 1. Free Node.js Hosting
- [Render](https://render.com/) (recommended for Node.js/Express)
  - Use `render.yaml` for one-click deploy or manual setup.
- [Railway](https://railway.app/)
  - Use `railway.json` for project config.
- [Fly.io](https://fly.io/)

### 2. Environment Setup
- Use `.env.example` as a template for production `.env`.
- Set `CORS_ORIGIN` to your frontend domain.
- Use HTTPS in production (Render/Railway provide SSL by default).
- Set strong `JWT_SECRET` and unique API keys for Cloudinary, Stripe, MongoDB Atlas.
- Add email credentials for SendGrid or SMTP.

### 3. Third-Party Keys
- **Cloudinary:** Get from [cloudinary.com](https://cloudinary.com/console)
- **MongoDB Atlas:** Get from [cloud.mongodb.com](https://cloud.mongodb.com/)
- **SendGrid:** Get from [sendgrid.com](https://app.sendgrid.com/settings/api_keys)

### 4. Scripts
- `npm run dev` — Start in development mode (nodemon)
- `npm start` — Start in production mode

### 5. API Documentation
- Import `swagger.json` into [Swagger Editor](https://editor.swagger.io/) or Postman for full API docs/testing.

## Security Checklist
- JWT auth is enforced on all protected routes.
- Rate limiting (100 req/15min/IP) is enabled.
- CORS is configurable for production.
- All uploads are validated and stored securely.

## Staging vs. Production
- Use a separate MongoDB database and Cloudinary bucket for staging.
- Set `NODE_ENV=production` for live deployments.
- Use different API keys/secrets for staging and production.
- Test all endpoints in staging before public launch.

---

SkillSwap backend is now deployment-ready for public launch!
