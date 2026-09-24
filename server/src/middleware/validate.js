export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const first = result.error.issues[0];
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: first ? `${first.path.join('.') || source}: ${first.message}` : 'Invalid request.',
      },
    });
  }
  // Express 5 makes req.query read-only, so keep parsed data on a separate property.
  req.valid = { ...(req.valid || {}), [source]: result.data };
  return next();
};
