import { ValidationPipe, ValidationPipeOptions, UnprocessableEntityException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

function flattenValidationErrors(errors: ValidationError[], parentPath = ''): string[] {
  return errors.flatMap((err) => {
    const path = parentPath ? `${parentPath}.${err.property}` : err.property;
    const own = err.constraints ? Object.values(err.constraints).map((m) => `${path}: ${m}`) : [];
    const nested = err.children?.length ? flattenValidationErrors(err.children, path) : [];
    return [...own, ...nested];
  });
}

export const globalValidationPipeOptions: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
  exceptionFactory: (errors: ValidationError[]) =>
    new UnprocessableEntityException({ message: flattenValidationErrors(errors) }),
};

export const createGlobalValidationPipe = () => new ValidationPipe(globalValidationPipeOptions);
