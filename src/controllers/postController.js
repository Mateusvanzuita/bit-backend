const postService = require('../services/postService');
const asyncHandler = require('../utils/asyncHandler');

class PostController {
  createPost = asyncHandler(async (req, res) => {
    const post = await postService.createPost(req.body, req.user.id);

    res.status(201).json({
      status: 'success',
      data: {
        post,
      },
    });
  });

  getAllPosts = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await postService.getAllPosts(page, limit);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  getPostById = asyncHandler(async (req, res) => {
    const post = await postService.getPostById(req.params.id);

    res.status(200).json({
      status: 'success',
      data: {
        post,
      },
    });
  });

  updatePost = asyncHandler(async (req, res) => {
    const post = await postService.updatePost(req.params.id, req.body, req.user.id);

    res.status(200).json({
      status: 'success',
      data: {
        post,
      },
    });
  });

  deletePost = asyncHandler(async (req, res) => {
    await postService.deletePost(req.params.id, req.user.id);

    res.status(200).json({
      status: 'success',
      data: {
        message: 'Post deleted successfully',
      },
    });
  });

  getUserPosts = asyncHandler(async (req, res) => {
    const posts = await postService.getUserPosts(req.user.id);

    res.status(200).json({
      status: 'success',
      data: {
        posts,
      },
    });
  });
}

module.exports = new PostController();
