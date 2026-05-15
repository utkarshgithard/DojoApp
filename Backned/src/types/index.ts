// Shared TypeScript types for the DojoApp backend

export interface JwtPayload {
  userId: string;
}

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    verified: boolean;
    friendCode: string;
    createdAt: Date;
  };
}
