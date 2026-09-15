import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET ?? "development-only-change-me";

export function attachUser(request, response, next) {
  const header = request.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return next();

  try {
    request.user = jwt.verify(token, jwtSecret);
  } catch {
    request.user = null;
  }
  return next();
}

export function requireAuth(request, response, next) {
  if (!request.user) {
    return response.status(401).json({ error: "Authentication required" });
  }
  return next();
}

export function requireRole(...allowedRoles) {
  return (request, response, next) => {
    if (!request.user || !allowedRoles.includes(request.user.role)) {
      return response.status(403).json({ error: "Insufficient role permission" });
    }
    return next();
  };
}
