import {
  type INestApplication,
  type Type,
  ValidationPipe,
  type ValidationPipeOptions,
} from "@nestjs/common";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { getAppOrigin } from "./shared/config/environment.js";

export function configureHttpApp(app: INestApplication): void {
  app.enableCors({
    credentials: true,
    origin: getAppOrigin(),
  });
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.useGlobalPipes(createHttpValidationPipe());
  app.setGlobalPrefix("api");
}

export function createHttpValidationPipe(expectedType?: Type<object>): ValidationPipe {
  const validationPipeOptions: ValidationPipeOptions = {
    forbidNonWhitelisted: true,
    transform: true,
    whitelist: true,
  };

  if (expectedType) {
    validationPipeOptions.expectedType = expectedType;
  }

  return new ValidationPipe(validationPipeOptions);
}
