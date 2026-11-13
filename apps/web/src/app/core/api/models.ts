import type { components } from './api-types';

// Friendly names for the types generated from the API's OpenAPI document.
// Regenerate with `npm run api:types` after changing a DTO in the API.
type Schemas = components['schemas'];

export type User = Schemas['UserDto'];
export type Session = Schemas['SessionDto'];
export type AccessibilitySettings = Schemas['AccessibilityDto'];
export type PageMeta = Schemas['PageMetaDto'];

export type RegisterRequest = Schemas['RegisterDto'];
export type LoginRequest = Schemas['LoginDto'];
export type UpdateProfileRequest = Schemas['UpdateProfileDto'];
export type ChangePasswordRequest = Schemas['ChangePasswordDto'];

export type Role = User['roles'][number];
export type UserStatus = User['status'];
export type Locale = User['locale'];

export interface Data<T> {
  data: T;
}

export interface Paged<T> {
  data: T[];
  meta: PageMeta;
}

export const API = '/api/v1';
