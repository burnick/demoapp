import { config } from '../utils/config';

console.log('JWT_SECRET:', config.JWT_SECRET);
console.log('JWT_SECRET type:', typeof config.JWT_SECRET);
console.log('JWT_SECRET length:', config.JWT_SECRET?.length);
console.log('JWT_REFRESH_SECRET:', config.JWT_REFRESH_SECRET);
console.log('JWT_EXPIRES_IN:', config.JWT_EXPIRES_IN);
console.log('JWT_REFRESH_EXPIRES_IN:', config.JWT_REFRESH_EXPIRES_IN);