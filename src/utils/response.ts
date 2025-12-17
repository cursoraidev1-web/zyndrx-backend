import { Response } from 'express';
 
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
 
export class ResponseHandler {
  static success<T>(res: Response, data: T, message?: string, statusCode = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
    };
    return res.status(statusCode).json(response);
  }
 
  static created<T>(res: Response, data: T, message = 'Resource created successfully'): Response {
    return this.success(res, data, message, 201);
  }
 
  static error(res: Response, error: string, statusCode = 400): Response {
    const response: ApiResponse = {
      success: false,
      error,
    };
    return res.status(statusCode).json(response);
  }
 
  static notFound(res: Response, message = 'Resource not found'): Response {
    return this.error(res, message, 404);
  }
 
  static unauthorized(res: Response, message = 'Unauthorized access'): Response {
    return this.error(res, message, 401);
  }
 
  static forbidden(res: Response, message = 'Access forbidden'): Response {
    return this.error(res, message, 403);
  }
 
  static serverError(res: Response, message = 'Internal server error'): Response {
    return this.error(res, message, 500);
  }
 
  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ): Response {
    const totalPages = Math.ceil(total / limit);
    const response: ApiResponse<T[]> = {
      success: true,
      data,
      message,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
    return res.status(200).json(response);
  }
}