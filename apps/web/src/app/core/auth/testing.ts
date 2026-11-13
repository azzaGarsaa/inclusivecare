import { Session, User } from '../api/models';

export const testUser: User = {
  id: '5b1f6c0e-3c1b-4a53-9a57-0d7c1f3b2a10',
  email: 'amina@example.test',
  firstName: 'Amina',
  lastName: 'Trabelsi',
  locale: 'en',
  status: 'ACTIVE',
  roles: ['USER'],
  accessibility: null,
  createdAt: '2026-11-01T10:00:00.000Z',
  lastLoginAt: null,
};

export const testSession = (
  accessToken = 'access-1',
  user: User = testUser,
): { data: Session } => ({
  data: { accessToken, expiresIn: 900, user },
});
