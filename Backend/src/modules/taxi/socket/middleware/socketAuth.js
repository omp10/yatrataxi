import { ApiError } from '../../../../utils/ApiError.js';
import { User } from '../../user/models/User.js';
import { verifyAccessToken } from '../../services/tokenService.js';

export const getIdentityFromSocket = (socket) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    throw new ApiError(401, 'Socket token is required');
  }

  return verifyAccessToken(token);
};

export const attachSocketAuth = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        socket.auth = { role: 'guest', sub: null };
        return next();
      }

      try {
        socket.auth = verifyAccessToken(token);

        if (socket.auth.role === 'user' && socket.auth.sub) {
          const user = await User.findById(socket.auth.sub).select('active isActive deletedAt').lean();

          if (!user || user.deletedAt || user.isActive === false || user.active === false) {
            socket.auth = { role: 'guest', sub: null };
          }
        }
      } catch (tokenErr) {
        socket.auth = { role: 'guest', sub: null };
      }

      next();
    } catch (error) {
      next(error);
    }
  });
};
