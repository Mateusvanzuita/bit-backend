const { body, param } = require('express-validator');

const createPostValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 10 })
    .withMessage('Content must be at least 10 characters long'),
  body('published')
    .optional()
    .isBoolean()
    .withMessage('Published must be a boolean value'),
];

const updatePostValidator = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Content must be at least 10 characters long'),
  body('published')
    .optional()
    .isBoolean()
    .withMessage('Published must be a boolean value'),
];

const postIdValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid post ID format'),
];

module.exports = {
  createPostValidator,
  updatePostValidator,
  postIdValidator,
};
