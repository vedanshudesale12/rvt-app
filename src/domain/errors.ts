export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class Unauthorized extends AppError {
  constructor(message = "Sign in required") {
    super(401, message);
    this.name = "Unauthorized";
  }
}

export class Forbidden extends AppError {
  constructor(message = "You can't do that") {
    super(403, message);
    this.name = "Forbidden";
  }
}

export class NotFound extends AppError {
  constructor(message = "Not found") {
    super(404, message);
    this.name = "NotFound";
  }
}
