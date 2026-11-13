// Public surface of the identity module. Other modules import from here only.
export { IdentityModule } from './identity.module.js';
export type { AuthenticatedUser, RequestOrigin } from './authenticated-user.js';
export { CurrentUser, Origin } from './decorators/current-user.decorator.js';
export { Public } from './decorators/public.decorator.js';
export { Roles } from './decorators/roles.decorator.js';
