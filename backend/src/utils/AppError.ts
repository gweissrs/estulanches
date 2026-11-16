/** Erro de domínio com status HTTP associado, tratado pelo middleware central de erros. */
export class AppError extends Error {
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, message, details);
  }
  static unauthorized(message = "Autenticação necessária.") {
    return new AppError(401, message);
  }
  static forbidden(message = "Você não tem permissão para acessar este recurso.") {
    return new AppError(403, message);
  }
  static notFound(message = "Recurso não encontrado.") {
    return new AppError(404, message);
  }
  static conflict(message: string) {
    return new AppError(409, message);
  }
}
