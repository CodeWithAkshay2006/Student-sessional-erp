/**
 * @file validate.js
 * @description Request validation middleware using Zod schemas.
 */

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message
      }));

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The submitted request data failed schema validation.',
          details
        }
      });
    }

    req[source] = result.data;
    next();
  };
}
