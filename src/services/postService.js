const postRepository = require('../repositories/postRepository');
const { AppError } = require('../middlewares/errorHandler');

class PostService {
  async createPost(postData, userId) {
    const post = await postRepository.create({
      ...postData,
      authorId: userId,
    });
    return post;
  }

  async getAllPosts(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const [posts, total] = await Promise.all([
      postRepository.findAllWithAuthor({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      postRepository.count(),
    ]);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPostById(id) {
    const post = await postRepository.findByIdWithAuthor(id);
    if (!post) {
      throw new AppError('Post not found', 404);
    }
    return post;
  }

  async updatePost(id, postData, userId) {
    const post = await postRepository.findById(id);
    if (!post) {
      throw new AppError('Post not found', 404);
    }

    // Check if user is the author
    if (post.authorId !== userId) {
      throw new AppError('You are not authorized to update this post', 403);
    }

    const updatedPost = await postRepository.update(id, postData);
    return updatedPost;
  }

  async deletePost(id, userId) {
    const post = await postRepository.findById(id);
    if (!post) {
      throw new AppError('Post not found', 404);
    }

    // Check if user is the author
    if (post.authorId !== userId) {
      throw new AppError('You are not authorized to delete this post', 403);
    }

    await postRepository.delete(id);
    return { message: 'Post deleted successfully' };
  }

  async getUserPosts(userId) {
    const posts = await postRepository.findByAuthor(userId);
    return posts;
  }
}

module.exports = new PostService();
