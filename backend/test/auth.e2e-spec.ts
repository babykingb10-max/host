import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../apps/api/src/app.module';
import { createGlobalValidationPipe } from '../apps/api/src/common/validation/validation.config';
import { GlobalExceptionFilter } from '../apps/api/src/common/errors/global-exception.filter';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(createGlobalValidationPipe());
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const uniqueSuffix = Date.now();
  const testUser = {
    displayName: 'E2E Test User',
    username: `e2e_user_${uniqueSuffix}`,
    email: `e2e_${uniqueSuffix}@example.com`,
    password: 'TestPassword123',
  };

  it('registers a new user and returns a session', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/register').send(testUser).expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('rejects registering the same email twice', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/register').send(testUser).expect(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AUTH_EMAIL_ALREADY_IN_USE');
  });

  it('logs in with the correct password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: testUser.username, password: testUser.password })
      .expect(200);

    expect(res.body.data.accessToken).toBeDefined();
  });

  it('rejects login with the wrong password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: testUser.username, password: 'WrongPassword!' })
      .expect(401);

    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('rejects an unauthenticated request to a protected route', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
  });

  it('returns the current user profile with a valid access token', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: testUser.username, password: testUser.password });

    const res = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`)
      .expect(200);

    expect(res.body.data.username).toBe(testUser.username);
  });
});
