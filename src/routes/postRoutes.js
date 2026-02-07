const express = require('express');
const postController = require('../controllers/postController');
const { createPostValidator, updatePostValidator, postIdValidator } = require('../validators/postValidator');
const validate = require('../middlewares/validate');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// All routes are protected
router.use(authMiddleware);

// Post routes
router.post('/', createPostValidator, validate, postController.createPost);
router.get('/', postController.getAllPosts);
router.get('/my-posts', postController.getUserPosts);
router.get('/:id', postIdValidator, validate, postController.getPostById);
router.put('/:id', postIdValidator, updatePostValidator, validate, postController.updatePost);
router.delete('/:id', postIdValidator, validate, postController.deletePost);

module.exports = router;
