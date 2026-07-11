import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../middleware/auth';
import * as authService from '../services/auth.service';

// Cross-origin deploy (Vercel front-end -> Railway API): the browser only keeps a
// cookie sent from another origin if it is SameSite=None AND Secure. In local dev
// (same origin, plain http) that combination is dropped, so fall back to Lax.
const isProd = process.env.NODE_ENV === 'production';
const refreshCookieBase = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
};

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.cookie('refreshToken', result.refreshToken, {
      ...refreshCookieBase,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    const result = await authService.refreshToken(token);

    res.cookie('refreshToken', result.refreshToken, {
      ...refreshCookieBase,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response) {
  res.clearCookie('refreshToken', refreshCookieBase);

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as RequestWithUser;
    const userData = await authService.getMe(user.id);

    res.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    next(error);
  }
}
